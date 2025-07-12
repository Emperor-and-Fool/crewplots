import { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { BarChart, LineChart, PieChart, Download, Calendar, FilePieChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Location } from "@shared/schema";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default function Reports() {
  const [selectedLocation, setSelectedLocation] = useState<number>(0);
  const [selectedReport, setSelectedReport] = useState<string>("sales");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("weekly");
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { user } = useAuth();

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // If user is a floor manager, use their assigned location
  const defaultLocationId = isFloorManager && user?.locationId ? user.locationId : selectedLocation;

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
  });

  // Generate mock data based on selections
  const generateMockData = () => {
    const now = new Date();
    let startDate, endDate;
    
    switch(selectedTimeframe) {
      case 'daily':
        startDate = endDate = now;
        break;
      case 'weekly':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = subDays(now, 7);
        endDate = now;
    }

    // Mock sales data
    const salesData = [
      { date: '2024-01-01', revenue: 1250, transactions: 45, avgTicket: 27.78 },
      { date: '2024-01-02', revenue: 1380, transactions: 52, avgTicket: 26.54 },
      { date: '2024-01-03', revenue: 980, transactions: 38, avgTicket: 25.79 },
      { date: '2024-01-04', revenue: 1520, transactions: 58, avgTicket: 26.21 },
      { date: '2024-01-05', revenue: 1750, transactions: 67, avgTicket: 26.12 },
      { date: '2024-01-06', revenue: 2100, transactions: 78, avgTicket: 26.92 },
      { date: '2024-01-07', revenue: 1950, transactions: 72, avgTicket: 27.08 },
    ];

    // Mock staff data
    const staffData = [
      { name: 'Sarah Johnson', role: 'Server', hoursWorked: 38, sales: 2450, tips: 280 },
      { name: 'Mike Chen', role: 'Bartender', hoursWorked: 42, sales: 3200, tips: 450 },
      { name: 'Lisa Rodriguez', role: 'Server', hoursWorked: 35, sales: 2100, tips: 250 },
      { name: 'David Kim', role: 'Host', hoursWorked: 30, sales: 0, tips: 120 },
      { name: 'Emma Wilson', role: 'Server', hoursWorked: 40, sales: 2800, tips: 320 },
    ];

    // Mock inventory data
    const inventoryData = [
      { item: 'Draft Beer', category: 'Beverages', usage: 85, waste: 5, cost: 420 },
      { item: 'House Wine', category: 'Beverages', usage: 72, waste: 3, cost: 380 },
      { item: 'Signature Cocktails', category: 'Beverages', usage: 95, waste: 8, cost: 580 },
      { item: 'Appetizers', category: 'Food', usage: 120, waste: 12, cost: 650 },
      { item: 'Main Courses', category: 'Food', usage: 180, waste: 15, cost: 920 },
    ];

    return { salesData, staffData, inventoryData };
  };

  const { salesData, staffData, inventoryData } = generateMockData();

  // Calculate totals
  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
  const totalTransactions = salesData.reduce((sum, day) => sum + day.transactions, 0);
  const avgTicketSize = totalRevenue / totalTransactions;

  return (
    <div className="flex h-screen bg-background">
      <div className="lg:flex hidden">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden">
          <MobileNavbar />
        </div>
        
        <Header />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="container mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground">
                  Performance insights and business metrics
                </p>
              </div>
              <Button className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Location:</label>
                <Select 
                  value={selectedLocation.toString()} 
                  onValueChange={(value) => setSelectedLocation(parseInt(value))}
                  disabled={isFloorManager}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isFloorManager && (
                      <SelectItem value="0">All Locations</SelectItem>
                    )}
                    {locations?.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Timeframe:</label>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from last period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <FilePieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from last period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Ticket Size</CardTitle>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${avgTicketSize.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    +3% from last period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Labor Hours</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {staffData.reduce((sum, staff) => sum + staff.hoursWorked, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This period
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Report Tabs */}
            <Tabs value={selectedReport} onValueChange={setSelectedReport} className="space-y-4">
              <TabsList>
                <TabsTrigger value="sales">Sales</TabsTrigger>
                <TabsTrigger value="staff">Staff Performance</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Sales Breakdown</CardTitle>
                    <CardDescription>Revenue and transaction details by day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Avg Ticket</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesData.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell>{format(new Date(day.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>${day.revenue.toLocaleString()}</TableCell>
                            <TableCell>{day.transactions}</TableCell>
                            <TableCell>${day.avgTicket.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Staff Performance</CardTitle>
                    <CardDescription>Individual team member metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Sales</TableHead>
                          <TableHead>Tips</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffData.map((staff) => (
                          <TableRow key={staff.name}>
                            <TableCell className="font-medium">{staff.name}</TableCell>
                            <TableCell>{staff.role}</TableCell>
                            <TableCell>{staff.hoursWorked}h</TableCell>
                            <TableCell>${staff.sales.toLocaleString()}</TableCell>
                            <TableCell>${staff.tips}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inventory Analysis</CardTitle>
                    <CardDescription>Usage, waste, and cost breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Waste %</TableHead>
                          <TableHead>Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryData.map((item) => (
                          <TableRow key={item.item}>
                            <TableCell className="font-medium">{item.item}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.usage} units</TableCell>
                            <TableCell>{((item.waste / item.usage) * 100).toFixed(1)}%</TableCell>
                            <TableCell>${item.cost}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}