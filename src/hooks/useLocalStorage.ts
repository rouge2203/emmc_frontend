import { useState, useEffect } from "react";

const getLocalValue = <T>(key: string, initValue: T): T => {
  // SSR Next.js
  if (typeof window === "undefined") return initValue;

  // if a value is already stored
  const localValue = localStorage.getItem(key);
  if (localValue) {
    try {
      return JSON.parse(localValue);
    } catch (error) {
      console.error(`Error parsing localStorage key "${key}":`, error);
      return initValue;
    }
  }

  // return result of a function
  if (initValue instanceof Function) return initValue();

  return initValue;
};

const useLocalStorage = <T>(
  key: string,
  initValue: T
): [T, (value: T | ((prev: T) => T)) => void] => {
  const [value, setValue] = useState<T>(() => {
    return getLocalValue(key, initValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

export default useLocalStorage;
