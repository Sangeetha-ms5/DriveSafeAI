# BYTE_FORCE1

Quick run instructions
----------------------

1) Create and activate a virtual environment (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2) Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3) Running options:

- Full pipeline (requires `serviceAccountKey.json` in the project root):

```powershell
& ".venv\Scripts\python.exe" run_pipeline_b.py
```

- Run from existing CSVs (no Firebase key needed):

```powershell
& ".venv\Scripts\python.exe" step2b_apply_threshold_rule.py
& ".venv\Scripts\python.exe" step4b_cluster_real_zones.py
& ".venv\Scripts\python.exe" step6b_dashboard_real.py
```

4) Open the generated `dashboard_real.html` in your browser. To serve locally:

```powershell
& ".venv\Scripts\python.exe" -m http.server 8000
# then open http://localhost:8000/dashboard_real.html
```

Notes:
- `serviceAccountKey.json` and `firebase-adminsdk-*.json` are intentionally ignored by git (see `.gitignore`). Download the service account JSON from Firebase Console -> Project Settings -> Service Accounts and place it in the project root if you want live Firebase fetches.
