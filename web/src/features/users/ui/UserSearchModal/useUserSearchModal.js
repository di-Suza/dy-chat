import { useEffect, useMemo, useRef, useState } from "react";

import { useSearchUsersQuery } from "../../api/usersApi.js";

const searchDebounceMs = 300;

export const useUserSearchModal = ({ isOpen }) => {
  const inputRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setDebouncedSearchValue("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, searchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [searchValue]);

  const shouldSkipSearch = !isOpen || debouncedSearchValue.length === 0;
  const searchState = useSearchUsersQuery(debouncedSearchValue, {
    skip: shouldSkipSearch
  });

  const users = useMemo(() => {
    return searchState.data?.users || [];
  }, [searchState.data?.users]);

  return {
    inputRef,
    isSearching: searchState.isFetching,
    searchError: searchState.error,
    searchValue,
    setSearchValue,
    showEmptyState:
      !shouldSkipSearch && !searchState.isFetching && users.length === 0,
    users
  };
};
