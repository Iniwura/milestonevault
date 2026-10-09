"""Reuse the repository's known-good Studio Dev Direct Mode harness.

The harness is imported read-only from MatchPay; MilestoneVault keeps its own
test suite and does not modify that repository.
"""

import importlib.util
from pathlib import Path


_SOURCE = Path("/home/ini/matchpay/tests/conftest.py")
_SPEC = importlib.util.spec_from_file_location("matchpay_direct_harness", _SOURCE)
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError("Direct Mode harness is unavailable")
_HARNESS = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_HARNESS)

for _name in dir(_HARNESS):
    if _name.startswith("__"):
        continue
    globals()[_name] = getattr(_HARNESS, _name)
