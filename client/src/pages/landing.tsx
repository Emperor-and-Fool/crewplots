import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  MapPin, 
  DollarSign, 
  UserPlus, 
  BarChart,
  CheckCircle,
  Film,
  Music,
  Camera,
  Mic
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Crew Management",
      description: "Organize your production team with skill tracking, competency management, and role assignments."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Smart Scheduling", 
      description: "Create and manage shifts with automated conflict detection and availability tracking."
    },
    {
      icon: <UserPlus className="h-6 w-6" />,
      title: "Application Pipeline",
      description: "Streamline hiring with application tracking, document management, and approval workflows."
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Multi-Location Support",
      description: "Manage crews across multiple venues, stages, or production sites from one platform."
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Cash Management",
      description: "Track petty cash, equipment deposits, and expense reconciliation for productions."
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "Analytics & Reports",
      description: "Gain insights into crew utilization, costs, and production metrics."
    }
  ];

  const industries = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Hospitality & Service",
      description: "Bars, restaurants, hotels, event venues",
      highlight: true
    },
    {
      icon: <Film className="h-8 w-8" />,
      title: "Film Production",
      description: "Feature films, shorts, documentaries"
    },
    {
      icon: <Camera className="h-8 w-8" />,
      title: "Television",
      description: "Series, commercials, live broadcasts"
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Festivals & Events", 
      description: "Music festivals, conferences, trade shows"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-900">CrewPlots Pro</h1>
              <Badge className="ml-3" variant="secondary">Day Production</Badge>
            </div>
            <Button 
              onClick={() => navigate("/login")}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Access Your Instance
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Day Production Crew
            <span className="block text-primary-600">Management Platform</span>
          </h2>
          <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
            Born in hospitality for bars, restaurants, and service teams—now powering 
            day-production crew management across festivals, film, television, and live events.
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            The same scheduling precision that keeps restaurants running now manages film sets, festival stages, and production crews worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-3"
            >
              Start Managing Your Crew
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-3"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              From Restaurant Floors to Film Sets
            </h3>
            <p className="text-lg text-gray-600">
              Started in hospitality, expanded across all day-production industries
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {industries.map((industry, index) => (
              <div key={index} className={`text-center ${industry.highlight ? 'relative' : ''}`}>
                {industry.highlight && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white">
                    Our Roots
                  </Badge>
                )}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4 ${
                  industry.highlight 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-primary-100 text-primary-600'
                }`}>
                  {industry.icon}
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {industry.title}
                </h4>
                <p className="text-gray-600">
                  {industry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Crew
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From initial application to final wrap, CrewPlots handles every aspect 
              of day production crew management.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-lg mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                Proven in Hospitality, Perfected for Productions
              </h3>
              <div className="mb-6 p-4 bg-primary-50 rounded-lg">
                <p className="text-primary-800 font-medium">
                  "If it can handle the chaos of a busy restaurant during dinner rush, 
                  it can manage any day-production crew."
                </p>
              </div>
              <div className="space-y-4">
                {[
                  "Battle-tested scheduling from high-volume restaurant operations",
                  "Cash management systems refined by bar and hotel environments", 
                  "Competency tracking that scales from servers to camera operators",
                  "Multi-location management across venues, sets, and stages",
                  "Compliance tools for hospitality labor laws and union requirements",
                  "Real-time analytics from fast-paced service environments"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white">
              <h4 className="text-2xl font-bold mb-4">From Service to Set</h4>
              <p className="text-primary-100 mb-6">
                Whether you're running a restaurant, managing a film crew, or coordinating a festival—the same 
                principles of day-production scheduling apply. Join teams who've made the switch.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/login")}
                className="w-full"
              >
                Access Your Production Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h5 className="text-lg font-semibold mb-4">CrewPlots Pro</h5>
              <p className="text-gray-400">
                The complete day production crew management platform for modern productions.
              </p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Industries</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Hospitality & Service</li>
                <li>Film Production</li>
                <li>Television</li>
                <li>Festivals & Events</li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Features</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Crew Management</li>
                <li>Smart Scheduling</li>
                <li>Application Pipeline</li>
                <li>Cash Management</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 CrewPlots Pro. Born in hospitality, serving production teams worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}