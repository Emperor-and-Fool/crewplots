import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { apiRequest } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CashCountForm } from "@/components/cash/cash-count-form";
import { PlusCircle, Pencil, Trash2, DollarSign, CalendarRange, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CashCount, Location } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function CashManagement() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCashCount, setSelectedCashCount] = useState<CashCount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("daily");
  const [, navigate] = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // If user is a floor manager, use their assigned location
  if (isFloorManager && user?.locationId && !selectedLocation) {
    setSelectedLocation(user.locationId);
  }

  // Format date for API
  const formatDateForApi = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Fetch cash counts
  const { data: cashCounts, isLoading } = useQuery<CashCount[]>({
    queryKey: ['/api/cash-counts'],
    enabled: true,
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Filter cash counts based on selected location and date
  const filteredCashCounts = cashCounts?.filter(count => {
    // Filter by location
    if (selectedLocation && count.locationId !== selectedLocation) {
      return false;
    }
    
    // Filter by date based on active tab
    if (activeTab === "daily") {
      // For daily view, filter to specific date
      const countDate = new Date(count.countDate).toDateString();
      const selectedDateStr = selectedDate.toDateString();
      return countDate === selectedDateStr;
    }
    
    // For weekly/monthly, additional filtering could be added here
    
    return true;
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/cash-counts/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate cash counts query
      await queryClient.invalidateQueries({ queryKey: ['/api/cash-counts'] });
      
      toast({
        title: "Cash Count Deleted",
        description: "The cash count has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting cash count:', error);
      toast({
        title: "Error",
        description: "Failed to delete cash count. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit cash count
  const handleEdit = (cashCount: CashCount) => {
    setSelectedCashCount(cashCount);
    setShowForm(true);
  };

  // Handle delete cash count
  const handleDelete = (cashCount: CashCount) => {
    setSelectedCashCount(cashCount);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedCashCount) {
      deleteMutation.mutate(selectedCashCount.id);
    }
  };

  // Handle location change
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
  };

  // Calculate daily totals
  const calculateDailyTotals = () => {
    if (!filteredCashCounts || filteredCashCounts.length === 0) {
      return {
        cashTotal: 0,
        cardTotal: 0,
        totalSales: 0,
        discrepancyTotal: 0
      };
    }
    
    return filteredCashCounts.reduce((totals, count) => {
      // Skip opening counts to avoid double counting floats
      if (count.countType === "opening") {
        return totals;
      }
      
      const cashAmount = Number(count.cashAmount) - (count.countType === "closing" ? Number(count.floatAmount) : 0);
      const cardAmount = Number(count.cardAmount);
      const discrepancy = Number(count.discrepancy || 0);
      
      return {
        cashTotal: totals.cashTotal + cashAmount,
        cardTotal: totals.cardTotal + cardAmount,
        totalSales: totals.totalSales + cashAmount + cardAmount,
        discrepancyTotal: totals.discrepancyTotal + discrepancy
      };
    }, {
      cashTotal: 0,
      cardTotal: 0,
      totalSales: 0,
      discrepancyTotal: 0
    });
  };

  const dailyTotals = calculateDailyTotals();

  // If not a manager or floor manager, redirect to dashboard
  if (!isLoading && !isManager && !isFloorManager) {
    navigate("/dashboard");
    return null;
  }

  // Helper to format count type
  const formatCountType = (type: string) => {
    switch (type) {
      case "opening": return "Opening Count";
      case "midday": return "Midday Count";
      case "closing": return "Closing Count";
      default: return type;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header onLocationChange={handleLocationChange} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showForm ? (
              // Show cash count form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setSelectedCashCount(null);
                  }}
                  className="mb-4"
                >
                  Back to Cash Management
                </Button>
                <CashCountForm 
                  cashCount={selectedCashCount || undefined} 
                  isEditing={!!selectedCashCount} 
                />
              </div>
            ) : (
              // Show cash management dashboard
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cash Management</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Track cash flow and reconcile registers
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        // Export functionality would go here
                        toast({
                          title: "Export Initiated",
                          description: "Your cash data export is being prepared.",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button onClick={() => {
                      setSelectedCashCount(null);
                      setShowForm(true);
                    }}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Cash Count
                    </Button>
                  </div>
                </div>

                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  {!user?.locationId && (
                    <Card className="w-full sm:w-auto">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor="location-filter" className="text-sm font-medium text-gray-700">Location:</label>
                          <Select 
                            value={selectedLocation?.toString() || ""} 
                            onValueChange={(value) => setSelectedLocation(value ? parseInt(value) : null)}
                          >
                            <SelectTrigger id="location-filter" className="w-[200px]">
                              <SelectValue placeholder="Select Location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations?.map(location => (
                                <SelectItem key={location.id} value={location.id.toString()}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card className="w-full sm:w-auto">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">Date:</label>
                        <div className="flex items-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-9"
                            onClick={() => {
                              const newDate = new Date(selectedDate);
                              newDate.setDate(newDate.getDate() - 1);
                              setSelectedDate(newDate);
                            }}
                          >
                            &lt;
                          </Button>
                          <span className="mx-2 text-sm">
                            {format(selectedDate, 'MMMM d, yyyy')}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-9"
                            onClick={() => {
                              const newDate = new Date(selectedDate);
                              newDate.setDate(newDate.getDate() + 1);
                              setSelectedDate(newDate);
                            }}
                          >
                            &gt;
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="ml-2 h-9"
                            onClick={() => setSelectedDate(new Date())}
                          >
                            Today
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Cash Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(dailyTotals.cashTotal)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Card Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(dailyTotals.cardTotal)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(dailyTotals.totalSales)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Discrepancies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${dailyTotals.discrepancyTotal === 0 ? 'text-success' : 'text-red-500'}`}>
                        {formatCurrency(dailyTotals.discrepancyTotal)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedLocation ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cash Counts</CardTitle>
                      <CardDescription>
                        {locations?.find(l => l.id === selectedLocation)?.name || `Location #${selectedLocation}`} - 
                        {format(selectedDate, 'MMMM d, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center py-4">
                          <p>Loading cash counts...</p>
                        </div>
                      ) : filteredCashCounts && filteredCashCounts.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Count Type</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Cash</TableHead>
                              <TableHead>Card</TableHead>
                              <TableHead>Float</TableHead>
                              <TableHead>Discrepancy</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCashCounts.map((count) => {
                              const isDiscrepancy = count.discrepancy && Math.abs(Number(count.discrepancy)) > 10;
                              const location = locations?.find(l => l.id === count.locationId);
                              
                              return (
                                <TableRow key={count.id}>
                                  <TableCell className="font-medium">
                                    {formatCountType(count.countType)}
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(count.createdAt), 'h:mm a')}
                                  </TableCell>
                                  <TableCell>{formatCurrency(count.cashAmount)}</TableCell>
                                  <TableCell>{formatCurrency(count.cardAmount)}</TableCell>
                                  <TableCell>{formatCurrency(count.floatAmount)}</TableCell>
                                  <TableCell className={isDiscrepancy ? 'text-red-500' : ''}>
                                    {formatCurrency(count.discrepancy || 0)}
                                  </TableCell>
                                  <TableCell>
                                    {!isDiscrepancy ? (
                                      <span className="inline-flex items-center text-green-700">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Balanced
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-red-600">
                                        <AlertCircle className="h-4 w-4 mr-1" />
                                        Discrepancy
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(count)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                      {isManager && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-500 hover:text-red-600"
                                          onClick={() => handleDelete(count)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Delete</span>
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-gray-500">No cash counts found for this date</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => {
                              setSelectedCashCount(null);
                              setShowForm(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Record cash count
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">
                        Select a Location
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Please select a location to view cash management data
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cash Count</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cash count from {format(new Date(selectedCashCount?.countDate || new Date()), 'MMMM d, yyyy')}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
