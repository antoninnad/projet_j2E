package fr.cytech.projetj2e.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/**
 * Format de pagination commun du contrat OpenAPI : { items, page: PageMeta }.
 * Les indices de page commencent à zéro.
 */
public record PageResponse<T>(List<T> items, PageMeta page) {

    public record PageMeta(int page, int size, long totalElements, int totalPages, boolean first, boolean last) {}

    public static <E, T> PageResponse<T> from(Page<E> source, Function<E, T> mapper) {
        return new PageResponse<>(
                source.getContent().stream().map(mapper).toList(),
                new PageMeta(source.getNumber(), source.getSize(), source.getTotalElements(),
                        source.getTotalPages(), source.isFirst(), source.isLast()));
    }
}
