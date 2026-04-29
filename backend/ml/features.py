import pandas as pd
from .preprocess import is_holiday, is_weekend, is_exam_season, is_pre_weekend
from .config import FEATURE_COLS

def generate_features(df: pd.DataFrame) -> pd.DataFrame:
    """Generate feature matrix with enhanced context."""
    if df.empty or "date" not in df.columns or "attendance" not in df.columns:
        return pd.DataFrame()

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["day_of_month"] = df["date"].dt.day
    df["weekend"] = df["date"].dt.weekday.apply(lambda x: 1 if x >= 5 else 0)
    df["holiday"] = df["date"].apply(lambda x: is_holiday(x.date()) if hasattr(x, 'date') else is_holiday(x))
    df["exam_season"] = df["date"].apply(lambda x: is_exam_season(x.date()) if hasattr(x, 'date') else is_exam_season(x))
    df["pre_weekend"] = df["date"].apply(lambda x: is_pre_weekend(x.date()) if hasattr(x, 'date') else is_pre_weekend(x))
    
    # Target Lagging Features (Crucial for time-series)
    df["prev_attendance"] = df["attendance"].shift(1)
    df["rolling_avg_3"] = df["attendance"].rolling(window=3, min_periods=1).mean()
    df["rolling_avg_7"] = df["attendance"].rolling(window=7, min_periods=1).mean()
    df["attendance_lag_2"] = df["attendance"].shift(2)
    df["attendance_lag_7"] = df["attendance"].shift(7)

    df = df.dropna().reset_index(drop=True)
    return df

def extract_feature_matrix(df: pd.DataFrame):
    """Extract X (features) and y (target) from the generated dataframe."""
    missing_cols = [col for col in FEATURE_COLS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing feature columns: {missing_cols}")
        
    X = df[FEATURE_COLS]
    y = df["attendance"] if "attendance" in df.columns else None
    
    return X, y
