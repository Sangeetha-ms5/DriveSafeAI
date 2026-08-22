"""
STEP 2B — Flag real danger events using a threshold rule.

Why no trained ML model here: the India-Smart Filter (RandomForest) was
trained on SIMULATED data with invented ground-truth labels. Real phone-shake
data has no such labels, and its sensor signature (a hand-shaken phone) does
not resemble a moving vehicle's sensor stream. Applying that model here would
produce meaningless predictions. Instead we use the same signal the model
itself found mattered most: force magnitude above normal gravity.
"""

import pandas as pd

INPUT_CSV = "real_driving_sensor_dataset.csv"
OUTPUT_CSV = "step2b_real_labeled_events.csv"
BASELINE_G = 9.8  # standard gravity, m/s^2


def apply_threshold(quantile_cutoff: float = 0.60):
    df = pd.read_csv(INPUT_CSV)

    required = {"magnitude", "lat", "lon", "car_id"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(
            f"Missing expected columns {missing}. Check index.html's write "
            f"structure matches these field names, or edit this script."
        )

    df["brake_force"] = (df["magnitude"] - BASELINE_G).clip(lower=0)

    threshold = df["brake_force"].quantile(quantile_cutoff)
    df["is_real_danger"] = df["brake_force"] >= threshold

    print(df["brake_force"].describe())
    print(f"\nThreshold used: {threshold:.3f}")
    print(f"Flagged {int(df['is_real_danger'].sum())} of {len(df)} events as real danger")

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved -> {OUTPUT_CSV}")
    return df


if __name__ == "__main__":
    apply_threshold()