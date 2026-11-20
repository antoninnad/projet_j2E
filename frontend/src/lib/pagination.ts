import type { Page } from "@/types/api"

export function paginate<T>(items: readonly T[], page = 0, size = 20): Page<T> {
  const totalElements = items.length
  const totalPages = Math.ceil(totalElements / size)

  return {
    items: items.slice(page * size, (page + 1) * size),
    page: { page, size, totalElements, totalPages, first: page === 0, last: page >= totalPages - 1 },
  }
}
