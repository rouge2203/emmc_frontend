import { useCallback, useEffect, useMemo, useState } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import NewsDrawer, { NewsItem } from "../../components/drawers/NewsDrawer";

const News = () => {
  const axiosPrivate = useAxiosPrivate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

  const fetchNews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axiosPrivate.get<{ news: NewsItem[] }>(
        "news/manage-news"
      );
      setNews(response.data.news);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Error al cargar las noticias"
      );
      console.error("Error fetching news:", err);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 250);
    }
  }, [axiosPrivate]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleCreateNews = () => {
    setEditingNews(null);
    setIsDrawerOpen(true);
  };

  const handleEditNews = (newsItem: NewsItem) => {
    setEditingNews(newsItem);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingNews(null);
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "sin fecha";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "sin fecha";
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "hace un momento";
    if (diffMinutes < 60) return `hace ${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `hace ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays}d`;
  };

  const newsItems = useMemo(() => news, [news]);

  return (
    <div className="pt-4 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Noticias</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona los comunicados y actualizaciones del sistema.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={handleCreateNews}
            className="block rounded-md bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            Crear noticia
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">
                Cargando noticias...
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-6">
          <div className="overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-gray-200/60">
            <ul role="list" className="divide-y divide-gray-100">
              {newsItems.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-gray-500">
                  No hay noticias creadas todavia.
                </li>
              ) : (
                newsItems.map((item) => {
                  const authorName = item.created_by
                    ? `${item.created_by.first_name || ""} ${
                        item.created_by.last_name || ""
                      }`.trim()
                    : "";
                  return (
                    <li
                      key={item.id}
                      className="flex gap-x-4 py-5 px-4 sm:px-6"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="size-16 flex-none rounded-md bg-gray-50 object-cover"
                        />
                      ) : (
                        <div className="size-16 flex-none rounded-md bg-gray-100 text-[10px] uppercase tracking-wide text-gray-400 flex items-center justify-center">
                          Sin imagen
                        </div>
                      )}
                      <div className="flex-auto">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                          <div>
                            <p className="text-sm/6 font-semibold text-gray-900">
                              {item.title}
                            </p>
                            {authorName && (
                              <p className="text-xs text-gray-500">
                                Por {authorName}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="flex-none text-xs text-gray-600">
                              <time dateTime={item.created_at || undefined}>
                                {formatRelativeTime(item.created_at)}
                              </time>
                            </p>
                            <button
                              type="button"
                              onClick={() => handleEditNews(item)}
                              className="text-xs font-semibold text-primary hover:text-primary/80"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm/6 text-gray-600">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}

      <NewsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        editingNews={editingNews}
        onNewsSaved={fetchNews}
      />
    </div>
  );
};

export default News;
