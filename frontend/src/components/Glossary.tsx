import { useState, useEffect } from "react";
import { Search, BookOpen, Plus, Loader2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { glossaryApi } from "../services/api";

interface GlossaryTerm {
  id: number;
  term: string;
  definition: string;
  category: "IT" | "Engineering" | "General";
}

export function Glossary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "IT" | "Engineering" | "General">("All");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTerm, setNewTerm] = useState({
    term: "",
    definition: "",
    category: "IT" as "IT" | "Engineering" | "General",
  });

  const [terms, setTerms] = useState<GlossaryTerm[]>([
    {
      id: 1,
      term: "API",
      definition: "Application Programming Interface - A set of protocols and tools that allows different software applications to communicate with each other.",
      category: "IT",
    },
    {
      id: 2,
      term: "CI/CD",
      definition: "Continuous Integration/Continuous Deployment - A method to frequently deliver apps to customers by introducing automation into the stages of app development.",
      category: "IT",
    },
    {
      id: 3,
      term: "REST",
      definition: "Representational State Transfer - An architectural style for designing networked applications, relying on stateless, client-server communication.",
      category: "IT",
    },
    {
      id: 4,
      term: "SAT",
      definition: "Supply Air Temperature - The temperature of air being delivered by an HVAC system to a conditioned space.",
      category: "Engineering",
    },
    {
      id: 5,
      term: "PAD",
      definition: "Pre-Cool Air Damper - A damper that controls the flow of pre-cooled air in HVAC systems to regulate temperature.",
      category: "Engineering",
    },
    {
      id: 6,
      term: "CDWR",
      definition: "Condenser Water Return Temperature - The temperature of water returning from the condenser in a cooling system.",
      category: "Engineering",
    },
    {
      id: 7,
      term: "SCADA",
      definition: "Supervisory Control and Data Acquisition - A system for remote monitoring and control of industrial processes.",
      category: "IT",
    },
    {
      id: 8,
      term: "PLC",
      definition: "Programmable Logic Controller - A digital computer used for automation of industrial processes.",
      category: "Engineering",
    },
    {
      id: 9,
      term: "RAT",
      definition: "Return Air Temperature - The temperature of air returning to the HVAC system from the conditioned space.",
      category: "Engineering",
    },
    {
      id: 10,
      term: "VPN",
      definition: "Virtual Private Network - A secure connection between networks over the internet.",
      category: "IT",
    },
    {
      id: 11,
      term: "OAT",
      definition: "Outdoor Air Temperature - The temperature of air outside the building.",
      category: "Engineering",
    },
    {
      id: 12,
      term: "SSH",
      definition: "Secure Shell - A protocol for secure remote login and other secure network services.",
      category: "IT",
    },
    {
      id: 13,
      term: "AHU",
      definition: "Air Handling Unit - A device used to condition and circulate air as part of an HVAC system.",
      category: "Engineering",
    },
    {
      id: 14,
      term: "JWT",
      definition: "JSON Web Token - A compact, URL-safe means of representing claims to be transferred between parties.",
      category: "IT",
    },
    {
      id: 15,
      term: "VAV",
      definition: "Variable Air Volume - A type of HVAC system that varies the airflow at a constant temperature.",
      category: "Engineering",
    },
    {
      id: 16,
      term: "DNS",
      definition: "Domain Name System - The system that translates domain names to IP addresses.",
      category: "IT",
    },
    {
      id: 17,
      term: "FCU",
      definition: "Fan Coil Unit - A device consisting of a heating/cooling coil and fan used to serve individual zones.",
      category: "Engineering",
    },
    {
      id: 18,
      term: "SQL",
      definition: "Structured Query Language - A standard language for managing and manipulating databases.",
      category: "IT",
    },
    {
      id: 19,
      term: "HMI",
      definition: "Human-Machine Interface - A user interface that connects a person to a machine or system.",
      category: "Engineering",
    },
    {
      id: 20,
      term: "HTTPS",
      definition: "Hypertext Transfer Protocol Secure - An extension of HTTP for secure communication over networks.",
      category: "IT",
    },
    {
      id: 21,
      term: "MAT",
      definition: "Mixed Air Temperature - The temperature of air after outdoor and return air have been mixed.",
      category: "Engineering",
    },
    {
      id: 22,
      term: "IoT",
      definition: "Internet of Things - The network of physical devices embedded with electronics and connectivity.",
      category: "IT",
    },
    {
      id: 23,
      term: "DP",
      definition: "Differential Pressure - The difference in pressure between two points in a system.",
      category: "Engineering",
    },
    {
      id: 24,
      term: "OAuth",
      definition: "Open Authorization - An open standard for access delegation commonly used for token-based authentication.",
      category: "IT",
    },
    {
      id: 25,
      term: "BMS",
      definition: "Building Management System - A computer-based control system for monitoring and managing building systems.",
      category: "Engineering",
    },
    {
      id: 26,
      term: "CDN",
      definition: "Content Delivery Network - A geographically distributed network of servers for fast content delivery.",
      category: "IT",
    },
    {
      id: 27,
      term: "VFD",
      definition: "Variable Frequency Drive - A device that controls the speed of an electric motor by varying frequency.",
      category: "Engineering",
    },
    {
      id: 28,
      term: "CORS",
      definition: "Cross-Origin Resource Sharing - A mechanism that allows restricted resources to be requested from another domain.",
      category: "IT",
    },
    {
      id: 29,
      term: "CWST",
      definition: "Chilled Water Supply Temperature - The temperature of chilled water supplied by a chiller.",
      category: "Engineering",
    },
    {
      id: 30,
      term: "WebSocket",
      definition: "A communication protocol providing full-duplex communication channels over a single TCP connection.",
      category: "IT",
    },
    {
      id: 31,
      term: "SLA",
      definition: "Service Level Agreement - A commitment between a service provider and a client.",
      category: "General",
    },
    {
      id: 32,
      term: "KPI",
      definition: "Key Performance Indicator - A measurable value that demonstrates effectiveness in achieving objectives.",
      category: "General",
    },
    {
      id: 33,
      term: "RMA",
      definition: "Return Merchandise Authorization - Permission to return a product for repair or replacement.",
      category: "General",
    },
    {
      id: 34,
      term: "ETA",
      definition: "Estimated Time of Arrival - The expected time when something will arrive.",
      category: "General",
    },
    {
      id: 35,
      term: "SOW",
      definition: "Statement of Work - A document defining project-specific activities and deliverables.",
      category: "General",
    },
    {
      id: 36,
      term: "POC",
      definition: "Proof of Concept - A realization of a method to demonstrate feasibility.",
      category: "General",
    },
    {
      id: 37,
      term: "QA",
      definition: "Quality Assurance - A way of preventing mistakes and defects in products and services.",
      category: "General",
    },
    {
      id: 38,
      term: "ROI",
      definition: "Return on Investment - A measure of the profitability of an investment.",
      category: "General",
    },
    {
      id: 39,
      term: "SOP",
      definition: "Standard Operating Procedure - A set of step-by-step instructions to help workers carry out operations.",
      category: "General",
    },
    {
      id: 40,
      term: "FAT",
      definition: "Factory Acceptance Test - Testing conducted at the manufacturer's site to verify equipment meets specifications.",
      category: "General",
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        setLoading(true);
        const data = await glossaryApi.getTerms();
        if (data && data.length > 0) {
          setTerms(data.map((t: any) => ({
            id: t.id,
            term: t.term,
            definition: t.definition,
            category: t.category || "General",
          })));
        }
      } catch (err) {
        console.error("Failed to fetch glossary:", err);
        // Keep default mock data
      } finally {
        setLoading(false);
      }
    };

    fetchGlossary();
  }, []);

  const filteredTerms = terms.filter((term) => {
    const matchesSearch =
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "All" || term.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const totalTerms = terms.length;
  const itTerms = terms.filter(t => t.category === "IT").length;
  const engineeringTerms = terms.filter(t => t.category === "Engineering").length;
  const searchResults = filteredTerms.length;

  const handleAddTerm = async () => {
    if (!newTerm.term || !newTerm.definition) return;

    const tempId = Date.now();
    const term: GlossaryTerm = {
      id: tempId,
      term: newTerm.term,
      definition: newTerm.definition,
      category: newTerm.category,
    };

    // Optimistic update
    setTerms([...terms, term]);
    setNewTerm({ term: "", definition: "", category: "IT" });
    setShowAddDialog(false);

    try {
      const createdTerm = await glossaryApi.createTerm({
        term: newTerm.term,
        definition: newTerm.definition,
        category: newTerm.category,
      });

      // Update with real ID
      setTerms(prev => prev.map(t =>
        t.id === tempId ? { ...t, id: createdTerm.id } : t
      ));
    } catch (err) {
      console.error("Failed to create term:", err);
      // Remove on error
      setTerms(prev => prev.filter(t => t.id !== tempId));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-gray-700" />
          <h1 className="text-xl text-gray-900">Shared Glossary</h1>
        </div>
        <p className="text-sm text-gray-600">A collaborative knowledge base for IT and Engineering terms</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search for terms or definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeFilter === "All" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("All")}
              className={activeFilter === "All" ? "bg-black hover:bg-gray-800" : ""}
            >
              All
            </Button>
            <Button
              variant={activeFilter === "IT" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("IT")}
              className={activeFilter === "IT" ? "bg-black hover:bg-gray-800" : ""}
            >
              IT
            </Button>
            <Button
              variant={activeFilter === "Engineering" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("Engineering")}
              className={activeFilter === "Engineering" ? "bg-black hover:bg-gray-800" : ""}
            >
              Engineering
            </Button>
            <Button
              variant={activeFilter === "General" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("General")}
              className={activeFilter === "General" ? "bg-black hover:bg-gray-800" : ""}
            >
              General
            </Button>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-black hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" />
            Add Term
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Total Terms</p>
          <p className="text-2xl text-gray-900">{totalTerms}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">IT Terms</p>
          <p className="text-2xl text-gray-900">{itTerms}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Engineering</p>
          <p className="text-2xl text-gray-900">{engineeringTerms}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600 mb-1">Search Results</p>
          <p className="text-2xl text-gray-900">{searchResults}</p>
        </Card>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTerms.map((term) => (
          <Card key={term.id} className="p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg text-gray-900">{term.term}</h3>
              <Badge
                className={
                  term.category === "IT"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : term.category === "Engineering"
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-purple-100 text-purple-700 border-purple-300"
                }
              >
                {term.category}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{term.definition}</p>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredTerms.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No terms found matching your search criteria.</p>
        </Card>
      )}

      {/* Add Term Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Term</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="term">Term / Acronym *</Label>
              <Input
                id="term"
                placeholder="e.g., API, HVAC, SLA"
                value={newTerm.term}
                onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value.toUpperCase() })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="definition">Definition *</Label>
              <Textarea
                id="definition"
                placeholder="Enter the full definition of the term"
                value={newTerm.definition}
                onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={newTerm.category}
                onValueChange={(value: "IT" | "Engineering" | "General") => setNewTerm({ ...newTerm, category: value })}
              >
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTerm}
              disabled={!newTerm.term || !newTerm.definition}
              className="bg-black hover:bg-gray-800"
            >
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
