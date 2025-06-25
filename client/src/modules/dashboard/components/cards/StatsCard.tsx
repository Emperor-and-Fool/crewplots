import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCardProps } from "../../types/dashboard.types";

export function StatsCard({ 
  title, 
  value, 
  subtitle,
  icon, 
  link,
  className,
  onClick 
}: StatsCardProps) {
  const cardContent = (
    <Card className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {link && (
          <p className="text-xs text-blue-600 mt-2 hover:text-blue-800">
            {link.text}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (onClick) {
    return <div onClick={onClick}>{cardContent}</div>;
  }

  return cardContent;
}