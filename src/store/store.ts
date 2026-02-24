import { combineReducers, configureStore } from "@reduxjs/toolkit";
import signupReducer, { type SignupState } from "./signupSlice";

const rootReducer = combineReducers({
  signup: signupReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export type PreloadedState = Partial<{
  signup: Partial<SignupState>;
}>;

export function makeStore(preloadedState?: PreloadedState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
