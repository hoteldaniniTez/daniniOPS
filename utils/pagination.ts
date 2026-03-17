
// [ 1, 2 ,3 4, 5, ..., 7 ];
export const generatePaginationNumbers = (currentPage: number, totalPages: number) => {

    //Si el numero total de paginas es <= 7 vamos a mostrar todas las páginas sin ...
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    //Si la página actual esta entre las primeras 3 páginas, mostrar las primeras 3, puntos suspensivos, y las ultimas 2
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages - 1, totalPages];

    //Si la pagina esta entre las 3 ultimas, mostramos las primeras 2, puntos suspensivos y las ultimas 3
    if (currentPage >= totalPages - 2) return [1, 2, '...', totalPages - 2, totalPages - 1, totalPages];

    //Si la pagina actual esta en un lugar medio, mostramos pagina 1, puntos suspensivos, la pagina actual y vecinos
    return [
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages
    ]

}