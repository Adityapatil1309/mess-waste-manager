import os
import json
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sqlalchemy.orm import Session
from .config import MODEL_PATH, METRICS_PATH, ARTIFACTS_DIR, XGB_PARAMS, TEST_SIZE, RANDOM_STATE, MIN_RECORDS_FOR_TRAIN, FEATURE_COLS
from .preprocess import load_historical_attendance, clean_data
from .features import generate_features, extract_feature_matrix

def train_model(db: Session, meal: str = "lunch", organization_code: str = None) -> dict:
    """Train XGBoost model on historical attendance data."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    # 1. Load Data
    raw_df = load_historical_attendance(db, meal, organization_code)
    
    if len(raw_df) < MIN_RECORDS_FOR_TRAIN:
        raise ValueError(f"Insufficient data: {len(raw_df)}/{MIN_RECORDS_FOR_TRAIN} records required for training.")

    # 2. Preprocess
    cleaned_df = clean_data(raw_df)
    
    # 3. Feature Engineering
    features_df = generate_features(cleaned_df)
    
    if features_df.empty:
        raise ValueError("Failed to generate features. Not enough sequential data.")

    # 4. Extract X, y
    X, y = extract_feature_matrix(features_df)

    # 5. Split Data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE)

    # 6. Train Model
    model = XGBRegressor(**XGB_PARAMS)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    # 7. Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    # 8. Save Model
    joblib.dump(model, MODEL_PATH)

    # 9. Log Metrics
    metrics = {
        "mae": round(float(mae), 2),
        "r2_score": round(float(r2), 4),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "features": FEATURE_COLS
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    return metrics
