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

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        setLoading(true);
        const response = await glossaryApi.getTerms();
        if (response.data?.terms) {
          setTerms(response.data.terms.map((t: any) => ({
            id: t.id,
            term: t.acronym || t.term,
            definition: t.definition,
            category: t.category || "General",
          })));
        }
      } catch (err) {
        console.error("Failed to fetch glossary:", err);
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
      const response = await glossaryApi.createTerm({
        term: newTerm.term,
        definition: newTerm.definition,
        categoryId: newTerm.category,
        department: newTerm.category === "IT" ? "IT" : newTerm.category === "Engineering" ? "Engineering" : "Both",
      });

      // Update with real ID from response
      if (response.data?.term) {
        setTerms(prev => prev.map(t =>
          t.id === tempId ? { ...t, id: response.data.term.id } : t
        ));
      }
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
