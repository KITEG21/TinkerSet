from pydantic import BaseModel
from typing import Any, List, Optional

class Filter(BaseModel):
    type: Optional[str] = None
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Any

class Action(BaseModel):
    type: str
    value: Any = None
    renameMode: Optional[str] = None
    find: Optional[str] = None
    replace: Optional[str] = None
    padding: Optional[int] = None  # For number_sequential: pad with zeros (e.g., 2 -> 01)
    prefix: Optional[str] = None  # For number_sequential: text before number (e.g., "ep_")
    suffix: Optional[str] = None  # For number_sequential: text after number (e.g., "_final")

class Job(BaseModel):
    path: str
    filters: List[Filter]
    actions: List[Action]