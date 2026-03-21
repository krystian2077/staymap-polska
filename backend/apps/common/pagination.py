from rest_framework.pagination import CursorPagination


class MapCursorPagination(CursorPagination):
    """Stabilna paginacja pod listy wyników i mapę (unika duplikatów przy geo-sort)."""

    page_size = 24
    ordering = "-created_at"
    cursor_query_param = "cursor"
