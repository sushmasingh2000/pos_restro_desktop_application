import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import aviatorReducer from "../slices/counterSlice";
import { combineReducers } from "redux";

// 1. Combine reducers (in case of multiple slices)
const rootReducer = combineReducers({
  aviator: aviatorReducer,
});

// 2. Persist configuration
const persistConfig = {
  key: "root",
  storage,
};

// 3. Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// 4. Configure store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // needed for redux-persist
    }),
});

// 5. Create persistor
export const persistor = persistStore(store);
export default store;
