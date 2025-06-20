import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  link?: {
    text: string;
    href: string;
  };
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  link,
  onClick,
  className
}: StatsCardProps) {
  return (
    <div className={cn("bg-white overflow-hidden shadow rounded-lg", className)}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 text-gray-400">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {link && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <a 
              href={link.href} 
              className="font-medium text-primary-700 hover:text-primary-900"
              onClick={(e) => {
                if (onClick) {
                  e.preventDefault();
                  onClick();
                }
              }}
            >
              {link.text}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
