import { useEffect, useState } from "react";
import { fetchSummary, type Summary } from "./api";

export function useSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetchSummary().then((result) => {
      if (result.ok) setSummary(result.data);
      else setError(result.error);
    });
  }, []);
  return { summary, error };
}
