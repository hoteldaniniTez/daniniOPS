'use client'
import { redirect, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { generatePaginationNumbers } from "@/utils";

interface Props {
    totalPages: number;

}
export const Pagination = ({ totalPages }: Props) => {

    const pathname = usePathname();
    const searchParams = useSearchParams();

    const pageString = searchParams.get('page') ?? 1; //nos devuelve el /?page=4 si no viene usara 1
    let currentPage = isNaN(+pageString) ? 1 : +pageString;
    if (currentPage < 1 || isNaN(+pageString)) redirect(pathname);

    const allPages = generatePaginationNumbers(currentPage, totalPages);
    // console.log({ pathname, searchParams,currentPage });


    const createPageUrl = (pageNumber: number | string) => {
        //nos sirve para construir los parametros de nuestro url
        const params = new URLSearchParams(searchParams);
        //"/?{param}={x}"==="/?page=3"
        if (pageNumber === '...') return `${pathname}?${params.toString()}`;
        //"/{pathname}"==="/kid"
        if (+pageNumber <= 0) return `${pathname}`;
        //"/{pathname}/?{param}={x}"==="/kid/?page=2"
        if (+pageNumber > totalPages) return `${pathname}?${params.toString()}`

        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    }

    return (
        <div className="flex text-center justify-center mt-10 mb-32">
            <nav aria-label="Page navigation example">
                <ul className="flex list-style-none">
                    <li className={`page-item`}>
                        <Link className="page-link relative block py-1.5 px-3 border-0 bg-transparent outline-none transition-all duration-300 rounded text-gray-800 hover:text-gray-800 hover:bg-gray-200 focus:shadow-none"
                            href={createPageUrl(currentPage - 1)}
                        >
                            <ChevronLeft size={30} />
                        </Link>
                    </li>

                    {
                        allPages.map((page, index) => (
                            <li key={page + '-' + index} className="page-item">
                                <Link className={
                                    clsx(
                                        "page-link relative block py-1.5 px-3 border-0 outline-none transition-all duration-300 rounded text-gray-800 hover:text-gray-800 hover:bg-gray-200 focus:shadow-none",
                                        {
                                            'bg-black shadow-md text-white hover:text-white hover:bg-gray-500': page === currentPage
                                        }
                                    )
                                }
                                    href={createPageUrl(page)}>
                                    {page}
                                </Link>
                            </li>
                        ))
                    }

                    <li className="page-item">
                        <Link className="page-link relative block py-1.5 px-3 border-0 bg-transparent outline-none transition-all duration-300 rounded text-gray-800 hover:text-gray-800 hover:bg-gray-200 focus:shadow-none"
                            href={createPageUrl(currentPage + 1)}
                        >
                            <ChevronRight size={30} />
                        </Link>
                    </li>
                </ul>
            </nav>
        </div>
    )
}
