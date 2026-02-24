import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SignupCreateData = {
  organisation: string;
  email: string;
  phoneNumber: string;
  phoneCountryIso: string;
  phoneDialCode: string;
  contact_no: string;
};

export type SignupOrganisationInfoData = {
  organisation: string;
  organisationType: string;
  businessId: string;
  industries: string[];
  industry_ids: string[];
  country: string;
  state: string;
  city: string;
  description: string;
};

export type SignupAccountData = {
  password: string;
  confirmPassword: string;
  agree: boolean;
};

export type SignupState = {
  create: SignupCreateData;
  organisationInfo: SignupOrganisationInfoData;
  account: SignupAccountData;
};

const initialState: SignupState = {
  create: {
    organisation: "",
    email: "",
    phoneNumber: "",
    phoneCountryIso: "GB",
    phoneDialCode: "",
    contact_no: "",
  },
  organisationInfo: {
    organisation: "",
    organisationType: "",
    businessId: "",
    industries: [],
    industry_ids: [],
    country: "",
    state: "",
    city: "",
    description: "",
  },
  account: {
    password: "",
    confirmPassword: "",
    agree: false,
  },
};

function mergeState(current: SignupState, patch: Partial<SignupState>): SignupState {
  return {
    create: { ...current.create, ...(patch.create || {}) },
    organisationInfo: {
      ...current.organisationInfo,
      ...(patch.organisationInfo || {}),
    },
    account: { ...current.account, ...(patch.account || {}) },
  };
}

export const signupSlice = createSlice({
  name: "signup",
  initialState,
  reducers: {
    hydrateSignup: (state, action: PayloadAction<Partial<SignupState>>) => {
      return mergeState(state, action.payload);
    },
    setCreateData: (state, action: PayloadAction<Partial<SignupCreateData>>) => {
      state.create = { ...state.create, ...action.payload };
    },
    setOrganisationInfoData: (
      state,
      action: PayloadAction<Partial<SignupOrganisationInfoData>>,
    ) => {
      state.organisationInfo = { ...state.organisationInfo, ...action.payload };
    },
    setAccountData: (state, action: PayloadAction<Partial<SignupAccountData>>) => {
      state.account = { ...state.account, ...action.payload };
    },
    resetSignup: () => initialState,
  },
});

export const {
  hydrateSignup,
  setCreateData,
  setOrganisationInfoData,
  setAccountData,
  resetSignup,
} = signupSlice.actions;

export default signupSlice.reducer;
