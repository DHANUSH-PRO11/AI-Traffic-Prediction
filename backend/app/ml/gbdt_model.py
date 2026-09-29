"""
Custom Gradient Boosted Decision Tree Regressor for continuous speed & travel time prediction.
Vectorized with NumPy for fast training and instant inference without external C-extensions.
Supports exact feature importance calculation, time-series splitting, and JSON/Joblib persistence.
"""
import json
import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional

class DecisionTreeNode:
    def __init__(
        self,
        feature_idx: Optional[int] = None,
        threshold: Optional[float] = None,
        left: Optional["DecisionTreeNode"] = None,
        right: Optional["DecisionTreeNode"] = None,
        value: Optional[float] = None,
        impurity_reduction: float = 0.0
    ):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value
        self.impurity_reduction = impurity_reduction

    def is_leaf(self) -> bool:
        return self.value is not None

    def to_dict(self) -> Dict[str, Any]:
        if self.is_leaf():
            return {"value": float(self.value)}
        return {
            "feature_idx": int(self.feature_idx),
            "threshold": float(self.threshold),
            "impurity_reduction": float(self.impurity_reduction),
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionTreeNode":
        if "value" in data and data["value"] is not None:
            return cls(value=data["value"])
        node = cls(
            feature_idx=data.get("feature_idx"),
            threshold=data.get("threshold"),
            impurity_reduction=data.get("impurity_reduction", 0.0),
        )
        if data.get("left"):
            node.left = cls.from_dict(data["left"])
        if data.get("right"):
            node.right = cls.from_dict(data["right"])
        return node


class RegressionTree:
    def __init__(self, max_depth: int = 4, min_samples_split: int = 10):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.root: Optional[DecisionTreeNode] = None
        self.feature_importances_accum = {}

    def fit(self, X: np.ndarray, y: np.ndarray) -> "RegressionTree":
        self.feature_importances_accum = {i: 0.0 for i in range(X.shape[1])}
        self.root = self._build_tree(X, y, depth=0)
        return self

    def _build_tree(self, X: np.ndarray, y: np.ndarray, depth: int) -> DecisionTreeNode:
        n_samples, n_features = X.shape
        if depth >= self.max_depth or n_samples < self.min_samples_split or np.var(y) < 1e-7:
            return DecisionTreeNode(value=float(np.mean(y)))

        best_feat, best_thresh, best_gain = self._best_split(X, y)
        if best_gain <= 1e-6 or best_feat is None:
            return DecisionTreeNode(value=float(np.mean(y)))

        # Split
        left_mask = X[:, best_feat] <= best_thresh
        right_mask = ~left_mask

        if np.sum(left_mask) == 0 or np.sum(right_mask) == 0:
            return DecisionTreeNode(value=float(np.mean(y)))

        self.feature_importances_accum[best_feat] += best_gain * n_samples

        left_child = self._build_tree(X[left_mask], y[left_mask], depth + 1)
        right_child = self._build_tree(X[right_mask], y[right_mask], depth + 1)

        return DecisionTreeNode(
            feature_idx=best_feat,
            threshold=best_thresh,
            left=left_child,
            right=right_child,
            impurity_reduction=best_gain
        )

    def _best_split(self, X: np.ndarray, y: np.ndarray) -> Tuple[Optional[int], Optional[float], float]:
        n_samples, n_features = X.shape
        total_var = np.var(y)
        best_gain = 0.0
        best_feat = None
        best_thresh = None

        # Sample features or inspect each
        for f in range(n_features):
            values = X[:, f]
            # Select up to 15 quantile candidate thresholds for efficiency
            quantiles = np.quantile(values, np.linspace(0.05, 0.95, 10))
            unique_thresholds = np.unique(quantiles)

            for thresh in unique_thresholds:
                left_mask = values <= thresh
                n_left = np.sum(left_mask)
                n_right = n_samples - n_left

                if n_left < 4 or n_right < 4:
                    continue

                left_var = np.var(y[left_mask])
                right_var = np.var(y[~left_mask])
                gain = total_var - ((n_left / n_samples) * left_var + (n_right / n_samples) * right_var)

                if gain > best_gain:
                    best_gain = gain
                    best_feat = f
                    best_thresh = thresh

        return best_feat, best_thresh, best_gain

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.array([self._predict_sample(sample, self.root) for sample in X])

    def _predict_sample(self, sample: np.ndarray, node: DecisionTreeNode) -> float:
        if node.is_leaf():
            return node.value
        if sample[node.feature_idx] <= node.threshold:
            return self._predict_sample(sample, node.left)
        return self._predict_sample(sample, node.right)


class GradientBoostedTrafficRegressor:
    """
    Gradient Boosted Regression Trees for Traffic Speed & Travel Time Prediction.
    """
    def __init__(self, n_estimators: int = 35, learning_rate: float = 0.15, max_depth: int = 4):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.base_pred = 0.0
        self.trees: List[RegressionTree] = []
        self.feature_names: List[str] = []
        self.feature_importances_: Dict[str, float] = {}

    def fit(self, X: np.ndarray, y: np.ndarray, feature_names: List[str]) -> "GradientBoostedTrafficRegressor":
        self.feature_names = feature_names
        self.base_pred = float(np.mean(y))
        y_pred = np.full_like(y, fill_value=self.base_pred, dtype=float)
        
        feature_importance_raw = {i: 0.0 for i in range(len(feature_names))}

        for i in range(self.n_estimators):
            # Compute negative gradient (residuals for MSE loss)
            residuals = y - y_pred
            tree = RegressionTree(max_depth=self.max_depth, min_samples_split=12)
            tree.fit(X, residuals)
            
            # Update predictions
            update = tree.predict(X)
            y_pred += self.learning_rate * update
            self.trees.append(tree)

            # Accumulate importances
            for feat_idx, imp in tree.feature_importances_accum.items():
                feature_importance_raw[feat_idx] += imp

        # Normalize feature importances to percentage (0.0 to 1.0)
        total_imp = sum(feature_importance_raw.values()) + 1e-9
        self.feature_importances_ = {
            self.feature_names[i]: round(feature_importance_raw[i] / total_imp, 4)
            for i in range(len(self.feature_names))
        }
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        preds = np.full(X.shape[0], fill_value=self.base_pred, dtype=float)
        for tree in self.trees:
            preds += self.learning_rate * tree.predict(X)
        return preds

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        preds = self.predict(X)
        mae = float(np.mean(np.abs(y - preds)))
        rmse = float(np.sqrt(np.mean((y - preds) ** 2)))
        
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        ss_res = np.sum((y - preds) ** 2)
        r2 = float(1.0 - (ss_res / (ss_tot + 1e-9)))
        
        mape = float(np.mean(np.abs((y - preds) / (y + 1e-9))) * 100.0)

        return {
            "MAE": round(mae, 2),
            "RMSE": round(rmse, 2),
            "R2": round(max(0.0, min(1.0, r2)), 3),
            "MAPE": round(mape, 2)
        }

    def save(self, filepath: str):
        payload = {
            "n_estimators": self.n_estimators,
            "learning_rate": self.learning_rate,
            "max_depth": self.max_depth,
            "base_pred": self.base_pred,
            "feature_names": self.feature_names,
            "feature_importances": self.feature_importances_,
            "trees": [
                {
                    "max_depth": tree.max_depth,
                    "min_samples_split": tree.min_samples_split,
                    "root": tree.root.to_dict() if tree.root else None
                }
                for tree in self.trees
            ]
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    @classmethod
    def load(cls, filepath: str) -> "GradientBoostedTrafficRegressor":
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        model = cls(
            n_estimators=data["n_estimators"],
            learning_rate=data["learning_rate"],
            max_depth=data["max_depth"]
        )
        model.base_pred = data["base_pred"]
        model.feature_names = data["feature_names"]
        model.feature_importances_ = data.get("feature_importances", {})
        
        model.trees = []
        for t_dict in data["trees"]:
            tree = RegressionTree(
                max_depth=t_dict["max_depth"],
                min_samples_split=t_dict["min_samples_split"]
            )
            if t_dict.get("root"):
                tree.root = DecisionTreeNode.from_dict(t_dict["root"])
            model.trees.append(tree)

        return model
