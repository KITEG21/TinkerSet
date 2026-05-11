use std::{collections::HashSet, env, path::PathBuf, process::{Child, Command, Stdio}, sync::Mutex, time::Duration};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Manager;

const BACKEND_URL: &str = "http://127.0.0.1:8000";
const HEALTH_URL: &str = "http://127.0.0.1:8000/health";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobFilter {
  #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
  pub filter_type: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub field: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub operator: Option<String>,
  #[serde(default)]
  pub value: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobAction {
  #[serde(rename = "type")]
  pub action_type: String,
  #[serde(rename = "renameMode", skip_serializing_if = "Option::is_none")]
  pub rename_mode: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub find: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub replace: Option<String>,
  #[serde(default)]
  pub value: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobPayload {
  pub path: String,
  pub filters: Vec<JobFilter>,
  pub actions: Vec<JobAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewEntry {
  pub original: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub status: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryInfo {
  pub path: String,
  pub file_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InterpretRequest {
  prompt: String,
  path: Option<String>,
  provider: Option<String>,
  model: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  api_key: Option<String>,
}

struct BackendProcess {
  child: Mutex<Option<Child>>,
}

impl BackendProcess {
  fn new(child: Child) -> Self {
    Self {
      child: Mutex::new(Some(child)),
    }
  }

  fn none() -> Self {
    Self {
      child: Mutex::new(None),
    }
  }
}

impl Drop for BackendProcess {
  fn drop(&mut self) {
    if let Some(mut child) = self.child.lock().ok().and_then(|mut guard| guard.take()) {
      let _ = child.kill();
      let _ = child.wait();
    }
  }
}

fn find_project_root() -> Result<PathBuf, String> {
  let mut dir = env::current_dir().map_err(|err| format!("Unable to resolve current directory: {err}"))?;

  for _ in 0..8 {
    if dir.join("app").join("main.py").exists() {
      return Ok(dir);
    }

    if !dir.pop() {
      break;
    }
  }

  Err("Unable to locate the Python backend root (expected app/main.py).".to_string())
}

fn resolve_python_executable(project_root: &PathBuf) -> String {
  if let Ok(python) = env::var("AFM_PYTHON") {
    return python;
  }

  let mut candidates = vec![
    project_root.join(".venv").join("Scripts").join("python.exe").to_string_lossy().into_owned(),
    project_root.join(".venv").join("bin").join("python.exe").to_string_lossy().into_owned(),
    project_root.join(".venv").join("bin").join("python").to_string_lossy().into_owned(),
    "python".to_string(),
  ];

  // On Windows PATH may contain multiple Python binaries (e.g. msys + CPython).
  // Probe each concrete path returned by `where python`.
  if let Ok(output) = Command::new("where").arg("python").output() {
    if output.status.success() {
      let stdout = String::from_utf8_lossy(&output.stdout);
      for line in stdout.lines() {
        let candidate = line.trim();
        if !candidate.is_empty() {
          candidates.push(candidate.to_string());
        }
      }
    }
  }

  let mut deduped = Vec::new();
  let mut seen = HashSet::new();
  for candidate in candidates {
    if seen.insert(candidate.clone()) {
      deduped.push(candidate);
    }
  }

  // Prefer an interpreter that can actually start the backend.
  for candidate in &deduped {
    let status = Command::new(candidate)
      .args(["-c", "import fastapi, uvicorn"])
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status();

    if matches!(status, Ok(result) if result.success()) {
      return candidate.clone();
    }
  }

  // Fall back to the first existing interpreter path.
  for candidate in &deduped {
    if candidate == "python" || PathBuf::from(candidate).exists() {
      return candidate.clone();
    }
  }

  "python".to_string()
}

fn spawn_backend() -> Result<Child, String> {
  let project_root = find_project_root()?;
  let python = resolve_python_executable(&project_root);
  let show_console = env::var("AFM_SHOW_PY_CONSOLE").map(|v| v != "0" && !v.eq_ignore_ascii_case("false")).unwrap_or(false);
  let mut command = Command::new(&python);
  command
    .current_dir(project_root)
    .args(["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"])
    .env("PYTHONUNBUFFERED", "1");

  // stdout/stderr handling
  if show_console {
    command.stdout(Stdio::inherit()).stderr(Stdio::inherit());
  } else {
    command.stdout(Stdio::null()).stderr(Stdio::null());
  }

  // On Windows we can request a new console or no window via creation flags.
  #[cfg(target_family = "windows")]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x00000010;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    if show_console {
      command.creation_flags(CREATE_NEW_CONSOLE);
    } else {
      // Prevent any console window from appearing
      command.creation_flags(CREATE_NO_WINDOW);
    }
  }

  command.spawn().map_err(|err| format!("Failed to start Python backend: {err}"))
}

fn wait_for_backend() -> Result<(), String> {
  let client = reqwest::blocking::Client::new();
  let mut last_error: Option<String> = None;

  for _ in 0..100 {
    match client.get(HEALTH_URL).send().and_then(|resp| resp.error_for_status()) {
      Ok(_) => return Ok(()),
      Err(err) => last_error = Some(err.to_string()),
    }

    std::thread::sleep(Duration::from_millis(200));
  }

  Err(format!(
    "Python backend did not become ready in time: {}",
    last_error.unwrap_or_else(|| "unknown error".to_string())
  ))
}

fn backend_is_ready() -> bool {
  reqwest::blocking::Client::new()
    .get(HEALTH_URL)
    .send()
    .and_then(|resp| resp.error_for_status())
    .is_ok()
}

fn post_json<T, U>(url: &str, payload: &T) -> Result<U, String>
where
  T: Serialize,
  U: for<'de> Deserialize<'de>,
{
  let client = reqwest::blocking::Client::new();
  let response = client
    .post(url)
    .json(payload)
    .send()
    .map_err(|err| format!("Request failed: {err}"))?;

  response
    .error_for_status()
    .map_err(|err| format!("Backend returned an error: {err}"))?
    .json::<U>()
    .map_err(|err| format!("Failed to decode backend response: {err}"))
}

#[tauri::command]
fn interpret_prompt(
  prompt: String,
  path: Option<String>,
  provider: Option<String>,
  model: Option<String>,
  api_key: Option<String>,
) -> Result<JobPayload, String> {
  let payload = InterpretRequest {
    prompt,
    path,
    provider,
    model,
    api_key,
  };
  post_json(&format!("{BACKEND_URL}/ai/interpret"), &payload)
}

#[tauri::command]
fn preview_job(job: Value) -> Result<Vec<PreviewEntry>, String> {
  post_json(&format!("{BACKEND_URL}/preview"), &job)
}

#[tauri::command]
fn execute_job(job: Value) -> Result<Vec<PreviewEntry>, String> {
  post_json(&format!("{BACKEND_URL}/execute"), &job)
}

#[tauri::command]
fn scan_directory(path: String) -> Result<DirectoryInfo, String> {
  let dir = PathBuf::from(&path);
  if !dir.exists() || !dir.is_dir() {
    return Err(format!("Failed to read directory: {}", dir.display()));
  }

  fn count_files_recursive(dir: &PathBuf) -> Result<usize, String> {
    let mut count = 0usize;
    let entries = std::fs::read_dir(dir).map_err(|err| format!("Failed to read directory: {err}"))?;

    for entry in entries.filter_map(|entry| entry.ok()) {
      let path = entry.path();
      if path.is_file() {
        count += 1;
      } else if path.is_dir() {
        count += count_files_recursive(&path)?;
      }
    }

    Ok(count)
  }

  let file_count = count_files_recursive(&dir)?;

  Ok(DirectoryInfo { path, file_count })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![interpret_prompt, preview_job, execute_job, scan_directory])
    .setup(|app| {
      let start_backend = env::var("AFM_START_BACKEND")
        .map(|value| value != "0" && !value.eq_ignore_ascii_case("false"))
        .unwrap_or(true);

      if start_backend && !backend_is_ready() {
        match spawn_backend() {
          Ok(backend) => {
            app.manage(BackendProcess::new(backend));
            if let Err(err) = wait_for_backend() {
              eprintln!("Backend did not become ready: {err}");
            }
          }
          Err(err) => {
            eprintln!("Backend could not be started: {err}");
            app.manage(BackendProcess::none());
          }
        }
      } else {
        app.manage(BackendProcess::none());
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
