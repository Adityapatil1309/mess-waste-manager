import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "ml_artifacts")

# Model File Paths
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "attendance_model.pkl")
METRICS_PATH = os.path.join(ARTIFACTS_DIR, "metrics.json")

# Feature Configuration
FEATURE_COLS = [
    "day_of_week", 
    "month", 
    "day_of_month", 
    "weekend", 
    "holiday",
    "exam_season", 
    "pre_weekend",
    "prev_attendance", 
    "rolling_avg_3", 
    "rolling_avg_7",
    "attendance_lag_2", 
    "attendance_lag_7"
]

# Indian Public Holidays
HOLIDAYS = [
    (1, 26), (3, 29), (4, 14), (5, 1), (8, 15),
    (10, 2), (10, 24), (11, 1), (11, 14), (12, 25)
]

# Training Config
TEST_SIZE = 0.2
RANDOM_STATE = 42
MIN_RECORDS_FOR_TRAIN = 30

# XGBoost Hyperparameters
XGB_PARAMS = {
    "n_estimators": 200,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": RANDOM_STATE,
    "objective": "reg:squarederror"
}
