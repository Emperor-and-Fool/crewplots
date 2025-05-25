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
  });

  // Calculate date ranges
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const formatDateRange = (start: Date, end: Date) => {
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Get date range based on selected timeframe
  const getDateRange = () => {
    switch (selectedTimeframe) {
      case "daily":
        return format(today, 'MMMM d, yyyy');
      case "weekly":
        return formatDateRange(weekStart, weekEnd);
      case "monthly":
        return formatDateRange(monthStart, monthEnd);
      case "yearly":
        return format(today, 'yyyy');
      default:
        return formatDateRange(weekStart, weekEnd);
    }
  };

  // Placeholder data for reports
  const salesData = {
    daily: [1200, 1500, 1800, 2100, 1900, 1700, 1600],
    categories: ["Food", "Beer", "Wine", "Spirits", "Cocktails", "Soft Drinks", "Other"],
    times: ["12pm", "2pm", "4pm", "6pm", "8pm", "10pm", "12am"],
  };

  const staffData = {
    names: ["Alex", "Jamie", "Sam", "Taylor", "Jordan", "Casey", "Riley"],
    hours: [35, 28, 40, 22, 15, 32, 25],
  };

  const inventoryData = {
    categories: ["Food", "Beer", "Wine", "Spirits", "Supplies"],
    values: [30, 25, 20, 15, 10],
  };

  // If not a manager or floor manager, redirect to dashboard
  if (!isManager && !isFloorManager) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header onLocationChange={(id) => setSelectedLocation(id)} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View business performance metrics and insights
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {defaultLocationId > 0 ? (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="report-select" className="text-sm font-medium text-gray-700">Report Type:</label>
                        <Select 
                          value={selectedReport} 
                          onValueChange={(value) => setSelectedReport(value)}
                        >
                          <SelectTrigger id="report-select" className="w-[180px]">
                            <SelectValue placeholder="Select report" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sales">Sales Report</SelectItem>
                            <SelectItem value="staff">Staff Report</SelectItem>
                            <SelectItem value="inventory">Inventory Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="timeframe-select" className="text-sm font-medium text-gray-700">Timeframe:</label>
                        <Select 
                          value={selectedTimeframe} 
                          onValueChange={(value) => setSelectedTimeframe(value)}
                        >
                          <SelectTrigger id="timeframe-select" className="w-[180px]">
                            <SelectValue placeholder="Select timeframe" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium">{getDateRange()}</span>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>
                      {selectedReport === "sales" && "Sales Report"}
                      {selectedReport === "staff" && "Staff Performance Report"}
                      {selectedReport === "inventory" && "Inventory Status Report"}
                    </CardTitle>
                    <CardDescription>
                      {locations?.find(l => l.id === defaultLocationId)?.name || `Location #${defaultLocationId}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedReport === "sales" && (
                      <Tabs defaultValue="overview">
                        <TabsList>
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="by-category">By Category</TabsTrigger>
                          <TabsTrigger value="by-time">By Time</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="py-4">
                          <div className="h-80 flex items-center justify-center border rounded bg-gray-50">
                            <div className="text-center">
                              <BarChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                              <p className="text-gray-500">Bar Chart of Sales Data Would Appear Here</p>
                              <p className="text-sm text-gray-400 mt-2">Placeholder for interactive sales chart</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-4">Sales Summary</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Metric</TableHead>
                                  <TableHead>Value</TableHead>
                                  <TableHead>Change</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">Total Sales</TableCell>
                                  <TableCell>$11,800</TableCell>
                                  <TableCell className="text-green-600">+8.2%</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Average Daily Sales</TableCell>
                                  <TableCell>$1,686</TableCell>
                                  <TableCell className="text-green-600">+5.1%</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Average Transaction</TableCell>
                                  <TableCell>$42.50</TableCell>
                                  <TableCell className="text-red-600">-2.3%</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Total Transactions</TableCell>
                                  <TableCell>278</TableCell>
                                  <TableCell className="text-green-600">+10.7%</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                        <TabsContent value="by-category" className="py-4">
                          <div className="h-80 flex items-center justify-center border rounded bg-gray-50">
                            <div className="text-center">
                              <PieChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                              <p className="text-gray-500">Pie Chart of Sales by Category Would Appear Here</p>
                              <p className="text-sm text-gray-400 mt-2">Placeholder for interactive category chart</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-4">Sales by Category</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>% of Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {salesData.categories.map((category, index) => (
                                  <TableRow key={category}>
                                    <TableCell className="font-medium">{category}</TableCell>
                                    <TableCell>${salesData.daily[index]}</TableCell>
                                    <TableCell>
                                      {Math.round(salesData.daily[index] / salesData.daily.reduce((a, b) => a + b, 0) * 100)}%
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                        <TabsContent value="by-time" className="py-4">
                          <div className="h-80 flex items-center justify-center border rounded bg-gray-50">
                            <div className="text-center">
                              <LineChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                              <p className="text-gray-500">Line Chart of Sales by Time Would Appear Here</p>
                              <p className="text-sm text-gray-400 mt-2">Placeholder for interactive time chart</p>
                            </div>
                          </div>
                          <div className="mt-6">
                            <h3 className="text-lg font-medium mb-4">Sales by Time of Day</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Time</TableHead>
                                  <TableHead>Amount</TableHead>
                                  <TableHead>% of Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {salesData.times.map((time, index) => (
                                  <TableRow key={time}>
                                    <TableCell className="font-medium">{time}</TableCell>
                                    <TableCell>${salesData.daily[index]}</TableCell>
                                    <TableCell>
                                      {Math.round(salesData.daily[index] / salesData.daily.reduce((a, b) => a + b, 0) * 100)}%
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                    
                    {selectedReport === "staff" && (
                      <div>
                        <div className="h-80 flex items-center justify-center border rounded bg-gray-50">
                          <div className="text-center">
                            <BarChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Bar Chart of Staff Hours Would Appear Here</p>
                            <p className="text-sm text-gray-400 mt-2">Placeholder for interactive staff chart</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-4">Staff Hours Summary</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Staff Member</TableHead>
                                <TableHead>Hours Worked</TableHead>
                                <TableHead>Performance Score</TableHead>
                                <TableHead>Sales Contribution</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {staffData.names.map((name, index) => (
                                <TableRow key={name}>
                                  <TableCell className="font-medium">{name}</TableCell>
                                  <TableCell>{staffData.hours[index]} hrs</TableCell>
                                  <TableCell>{Math.floor(Math.random() * 10) + 90}%</TableCell>
                                  <TableCell>${Math.floor(staffData.hours[index] * (Math.random() * 50 + 150))}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    
                    {selectedReport === "inventory" && (
                      <div>
                        <div className="h-80 flex items-center justify-center border rounded bg-gray-50">
                          <div className="text-center">
                            <PieChart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">Pie Chart of Inventory Distribution Would Appear Here</p>
                            <p className="text-sm text-gray-400 mt-2">Placeholder for interactive inventory chart</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-4">Inventory Status</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>% of Total</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inventoryData.categories.map((category, index) => (
                                <TableRow key={category}>
                                  <TableCell className="font-medium">{category}</TableCell>
                                  <TableCell>${inventoryData.values[index] * 1000}</TableCell>
                                  <TableCell>
                                    {inventoryData.values[index]}%
                                  </TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      index % 3 === 0 ? 'bg-green-100 text-green-800' : 
                                      index % 3 === 1 ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {index % 3 === 0 ? 'Healthy' : 
                                       index % 3 === 1 ? 'Warning' : 
                                       'Low Stock'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="bg-white rounded-md shadow p-8 text-center">
                <FilePieChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Location
                </h3>
                <p className="text-gray-500 mb-4">
                  Please select a location from the dropdown in the header to view reports and analytics.
                </p>
                <Button
                  variant="outline"
                  onClick={() => isManager ? navigate("/locations") : null}
                  disabled={!isManager}
                >
                  {isManager ? "Manage Locations" : "Contact a manager to set up locations"}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}