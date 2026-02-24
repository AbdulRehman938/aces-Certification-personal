"use client";

import { useCallback, useMemo } from "react";

type Permission = {
  resource: string;
  action: string[] | string;
};

type ProfileData = {
  _type?: string;
  permissions?: Permission[];
  [key: string]: unknown;
};

export function useEmployeePermissions(profileData: ProfileData | null) {
  const isEmployee = profileData?._type === "employee";
  const permissions = useMemo(
    () => profileData?.permissions ?? [],
    [profileData?.permissions],
  );

  const hasRead = useCallback(
    (resource: string): boolean => {
      if (!isEmployee) return true;
      return permissions.some((p) => {
        const actions = Array.isArray(p.action)
          ? p.action
          : typeof p.action === "string"
            ? [p.action]
            : [];
        return (
          p.resource === resource &&
          actions.some((a) => a.toLowerCase() === "read")
        );
      });
    },
    [isEmployee, permissions],
  );

  const hasWrite = useCallback(
    (resource: string): boolean => {
      if (!isEmployee) return true;
      return permissions.some((p) => {
        const actions = Array.isArray(p.action)
          ? p.action
          : typeof p.action === "string"
            ? [p.action]
            : [];
        return (
          p.resource === resource &&
          actions.some((a) => a.toLowerCase() === "write")
        );
      });
    },
    [isEmployee, permissions],
  );

  const hasAccess = useCallback(
    (resource: string): boolean => {
      if (!isEmployee) return true;
      return permissions.some((p) => p.resource === resource);
    },
    [isEmployee, permissions],
  );

  return { isEmployee, hasRead, hasWrite, hasAccess };
}
