import { useCallback, useEffect, useMemo, useState } from 'react';
import { BOOKLET_COPY, BOOKLET_PAGE_SIZE } from '../constants/booklets';
import { friendlyBookletError, searchBooklets } from '../services/bookletService';
import { Booklet, BookletSort, SearchFilterState } from '../types';

export function useBookletSearch(filter: SearchFilterState) {
  const filterKey = JSON.stringify(filter);
  const stableFilter = useMemo(() => JSON.parse(filterKey) as SearchFilterState, [filterKey]);
  const [items, setItems] = useState<Booklet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<BookletSort>('newest');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (nextPage: number, nextSort: BookletSort, mode: 'replace' | 'append' | 'refresh') => {
      if (mode === 'replace') setLoading(true);
      if (mode === 'append') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      setError('');
      try {
        const result = await searchBooklets(stableFilter, {
          page: nextPage,
          pageSize: BOOKLET_PAGE_SIZE,
          sort: nextSort,
        });
        setTotal(result.total);
        setPage(nextPage);
        setItems((current) => (mode === 'append' ? [...current, ...result.rows] : result.rows));
      } catch (caught) {
        setError(friendlyBookletError(caught) || BOOKLET_COPY.genericError);
        if (mode !== 'append') {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [stableFilter]
  );

  useEffect(() => {
    void load(0, sort, 'replace');
  }, [load, sort]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || items.length >= total) return;
    void load(page + 1, sort, 'append');
  }, [items.length, load, loading, loadingMore, page, sort, total]);

  const retry = useCallback(() => {
    void load(0, sort, 'replace');
  }, [load, sort]);

  const refresh = useCallback(() => {
    void load(0, sort, 'refresh');
  }, [load, sort]);

  const changeSort = useCallback((next: BookletSort) => {
    setSort(next);
  }, []);

  return {
    items,
    total,
    loading,
    loadingMore,
    refreshing,
    error,
    sort,
    hasMore: items.length < total,
    loadMore,
    retry,
    refresh,
    changeSort,
  };
}
