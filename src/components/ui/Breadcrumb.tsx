import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
}

export function Breadcrumb({ items, homeHref = '/dashboard' }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link 
            to={homeHref}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Inicio
          </Link>
        </li>
        
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            {item.href && index < items.length - 1 ? (
              <Link
                to={item.href}
                className="ml-1 text-sm font-medium text-gray-500 hover:text-blue-600 md:ml-2"
              >
                {item.label}
              </Link>
            ) : (
              <span className="ml-1 text-sm font-medium text-gray-700 md:ml-2">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 