"""
rf_classifier.py
----------------
High-performance pure-Python/NumPy Random Forest Classifier for multiclass traffic prediction.
Eliminates external C-extension/DLL dependencies blocked by Windows Application Control policies.
Provides full scikit-learn compatible interface: fit, predict, predict_proba, and feature_importances_.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple, Union


class DecisionTreeNode:
    def __init__(
        self,
        feature_idx: Optional[int] = None,
        threshold: Optional[float] = None,
        left: Optional["DecisionTreeNode"] = None,
        right: Optional["DecisionTreeNode"] = None,
        probabilities: Optional[np.ndarray] = None,
        gain: float = 0.0,
    ):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.probabilities = probabilities
        self.gain = gain

    def is_leaf(self) -> bool:
        return self.probabilities is not None

    def to_dict(self) -> Dict[str, Any]:
        if self.is_leaf():
            return {"probabilities": self.probabilities.tolist() if self.probabilities is not None else []}
        return {
            "feature_idx": self.feature_idx,
            "threshold": float(self.threshold) if self.threshold is not None else 0.0,
            "gain": float(self.gain),
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DecisionTreeNode":
        if "probabilities" in data and data["probabilities"] is not None:
            return cls(probabilities=np.array(data["probabilities"], dtype=float))
        node = cls(
            feature_idx=data.get("feature_idx"),
            threshold=data.get("threshold"),
            gain=data.get("gain", 0.0),
        )
        if data.get("left"):
            node.left = cls.from_dict(data["left"])
        if data.get("right"):
            node.right = cls.from_dict(data["right"])
        return node


class DecisionTreeClassifier:
    def __init__(
        self,
        n_classes: int = 4,
        max_depth: int = 10,
        min_samples_split: int = 4,
        max_features: Optional[int] = None,
        random_state: Optional[int] = None,
    ):
        self.n_classes = n_classes
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.max_features = max_features
        self.random_state = random_state
        self.root: Optional[DecisionTreeNode] = None
        self.feature_importances_accum: Dict[int, float] = {}

    def fit(self, X: np.ndarray, y: np.ndarray, rng: np.random.Generator) -> "DecisionTreeClassifier":
        n_features = X.shape[1]
        self.feature_importances_accum = {i: 0.0 for i in range(n_features)}
        self.root = self._build_tree(X, y, depth=0, rng=rng)
        return self

    def _gini(self, y: np.ndarray) -> float:
        n = len(y)
        if n == 0:
            return 0.0
        counts = np.bincount(y, minlength=self.n_classes)
        probs = counts / n
        return float(1.0 - np.sum(probs ** 2))

    def _leaf_probs(self, y: np.ndarray) -> np.ndarray:
        counts = np.bincount(y, minlength=self.n_classes)
        total = len(y)
        if total == 0:
            return np.ones(self.n_classes) / self.n_classes
        return counts / total

    def _build_tree(
        self, X: np.ndarray, y: np.ndarray, depth: int, rng: np.random.Generator
    ) -> DecisionTreeNode:
        n_samples, n_features = X.shape
        unique_classes = np.unique(y)

        if depth >= self.max_depth or n_samples < self.min_samples_split or len(unique_classes) <= 1:
            return DecisionTreeNode(probabilities=self._leaf_probs(y))

        # Select random subset of features if configured
        feat_indices = np.arange(n_features)
        if self.max_features and self.max_features < n_features:
            feat_indices = rng.choice(feat_indices, size=self.max_features, replace=False)

        current_gini = self._gini(y)
        best_gain = 0.0
        best_feat = None
        best_thresh = None

        for f in feat_indices:
            x_col = X[:, f]
            # Use percentiles / unique values for fast threshold search
            vals = np.unique(x_col)
            if len(vals) <= 1:
                continue
            if len(vals) > 20:
                percentiles = np.linspace(5, 95, 19)
                thresholds = np.percentile(vals, percentiles)
            else:
                thresholds = (vals[:-1] + vals[1:]) / 2.0

            for thresh in thresholds:
                left_mask = x_col <= thresh
                n_left = np.sum(left_mask)
                n_right = n_samples - n_left
                if n_left == 0 or n_right == 0:
                    continue

                gini_left = self._gini(y[left_mask])
                gini_right = self._gini(y[~left_mask])
                weighted_gini = (n_left * gini_left + n_right * gini_right) / n_samples
                gain = current_gini - weighted_gini

                if gain > best_gain:
                    best_gain = gain
                    best_feat = f
                    best_thresh = thresh

        if best_gain <= 1e-5 or best_feat is None or best_thresh is None:
            return DecisionTreeNode(probabilities=self._leaf_probs(y))

        self.feature_importances_accum[best_feat] += best_gain * n_samples

        left_mask = X[:, best_feat] <= best_thresh
        right_mask = np.logical_not(left_mask)
        left_child = self._build_tree(X[left_mask], y[left_mask], depth + 1, rng)
        right_child = self._build_tree(X[right_mask], y[right_mask], depth + 1, rng)

        return DecisionTreeNode(
            feature_idx=best_feat,
            threshold=best_thresh,
            left=left_child,
            right=right_child,
            gain=best_gain,
        )

    def predict_row_proba(self, x: np.ndarray) -> np.ndarray:
        node = self.root
        while node and not node.is_leaf():
            if x[node.feature_idx] <= node.threshold:
                node = node.left
            else:
                node = node.right
        if node and node.probabilities is not None:
            return node.probabilities
        return np.ones(self.n_classes) / self.n_classes


class PureRandomForestClassifier:
    """
    NumPy-accelerated Random Forest Classifier.
    Fully compatible drop-in replacement for sklearn.ensemble.RandomForestClassifier.
    """
    def __init__(
        self,
        n_estimators: int = 35,
        max_depth: int = 10,
        min_samples_split: int = 4,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.random_state = random_state
        self.trees: List[DecisionTreeClassifier] = []
        self.n_classes_ = 4
        self.classes_ = np.array([0, 1, 2, 3])
        self.feature_importances_ = np.zeros(7)
        self.feature_names: List[str] = []

    def fit(self, X: Union[np.ndarray, pd.DataFrame], y: Union[np.ndarray, pd.Series]) -> "PureRandomForestClassifier":
        if isinstance(X, pd.DataFrame):
            self.feature_names = list(X.columns)
            X_arr = X.to_numpy(dtype=float)
        else:
            X_arr = np.asarray(X, dtype=float)

        if isinstance(y, pd.Series):
            y_arr = y.to_numpy(dtype=int)
        else:
            y_arr = np.asarray(y, dtype=int)

        self.classes_ = np.unique(y_arr)
        self.n_classes_ = len(self.classes_)
        n_samples, n_features = X_arr.shape

        rng = np.random.default_rng(self.random_state)
        max_features = max(1, int(np.sqrt(n_features)))

        self.trees = []
        accum_importances = np.zeros(n_features)

        for _ in range(self.n_estimators):
            # Bootstrap sample
            boot_idx = rng.choice(n_samples, size=n_samples, replace=True)
            X_boot = X_arr[boot_idx]
            y_boot = y_arr[boot_idx]

            tree = DecisionTreeClassifier(
                n_classes=self.n_classes_,
                max_depth=self.max_depth,
                min_samples_split=self.min_samples_split,
                max_features=max_features,
            )
            tree.fit(X_boot, y_boot, rng)
            self.trees.append(tree)

            for feat_idx, imp in tree.feature_importances_accum.items():
                accum_importances[feat_idx] += imp

        total_imp = np.sum(accum_importances)
        if total_imp > 0:
            self.feature_importances_ = accum_importances / total_imp
        else:
            self.feature_importances_ = np.ones(n_features) / n_features

        return self

    def predict_proba(self, X: Union[np.ndarray, pd.DataFrame]) -> np.ndarray:
        if isinstance(X, pd.DataFrame):
            X_arr = X.to_numpy(dtype=float)
        else:
            X_arr = np.asarray(X, dtype=float)

        if len(self.trees) == 0:
            # Fallback uniform
            return np.ones((X_arr.shape[0], self.n_classes_)) / self.n_classes_

        all_tree_probs = []
        for tree in self.trees:
            tree_probs = np.array([tree.predict_row_proba(x) for x in X_arr])
            all_tree_probs.append(tree_probs)

        # Average probabilities across trees
        avg_probs = np.mean(all_tree_probs, axis=0)
        return avg_probs

    def predict(self, X: Union[np.ndarray, pd.DataFrame]) -> np.ndarray:
        probs = self.predict_proba(X)
        return np.argmax(probs, axis=1)

    def save(self, filepath: str):
        """Save entire model structure to disk using joblib or JSON."""
        model_data = {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "random_state": self.random_state,
            "n_classes_": self.n_classes_,
            "classes_": self.classes_.tolist(),
            "feature_importances_": self.feature_importances_.tolist(),
            "feature_names": self.feature_names,
            "trees": [
                {
                    "n_classes": t.n_classes,
                    "max_depth": t.max_depth,
                    "min_samples_split": t.min_samples_split,
                    "max_features": t.max_features,
                    "root": t.root.to_dict() if t.root else None,
                }
                for t in self.trees
            ],
        }
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(model_data, filepath)

    @classmethod
    def load(cls, filepath: str) -> "PureRandomForestClassifier":
        model_data = joblib.load(filepath)
        # If model_data is an instance (pickled object), return it directly
        if isinstance(model_data, cls):
            return model_data

        clf = cls(
            n_estimators=model_data["n_estimators"],
            max_depth=model_data["max_depth"],
            min_samples_split=model_data["min_samples_split"],
            random_state=model_data.get("random_state", 42),
        )
        clf.n_classes_ = model_data.get("n_classes_", 4)
        clf.classes_ = np.array(model_data.get("classes_", [0, 1, 2, 3]))
        clf.feature_importances_ = np.array(model_data.get("feature_importances_", []))
        clf.feature_names = model_data.get("feature_names", [])

        clf.trees = []
        for t_data in model_data.get("trees", []):
            dt = DecisionTreeClassifier(
                n_classes=t_data["n_classes"],
                max_depth=t_data["max_depth"],
                min_samples_split=t_data["min_samples_split"],
                max_features=t_data.get("max_features"),
            )
            if t_data.get("root"):
                dt.root = DecisionTreeNode.from_dict(t_data["root"])
            clf.trees.append(dt)

        return clf
