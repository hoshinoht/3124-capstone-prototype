import { useState, useEffect, useRef } from "react";
import { Search, BookOpen, Plus, Loader2, Upload, Download, FileText, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { glossaryApi } from "../services/api";

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: "IT" | "Engineering" | "General";
}

export function Glossary() {
  const normalizeCategory = (value?: string | null): "IT" | "Engineering" | "General" => {
    if (!value) return "General";

    const normalized = value.trim().toLowerCase();
    if (normalized === "it" || normalized === "information technology") return "IT";
    if (normalized === "engineering" || normalized === "eng") return "Engineering";
    if (normalized === "general") return "General";

    return "General";
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "IT" | "Engineering" | "General">("All");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTerm, setNewTerm] = useState({
    term: "",
    definition: "",
    category: "IT" as "IT" | "Engineering" | "General",
  });

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const TERMS_PER_PAGE = 16;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlossary = async () => {
      try {
        setLoading(true);
        const response = await glossaryApi.getTerms();
        if (response.data?.terms) {
          setTerms(
            response.data.terms.map((t: any) => ({
              id: t.id,
              term: t.acronym || t.term,
              definition: t.definition,
              category: normalizeCategory(t.categoryName || t.category),
            }))
          );
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredTerms.length / TERMS_PER_PAGE);
  const startIndex = (currentPage - 1) * TERMS_PER_PAGE;
  const endIndex = startIndex + TERMS_PER_PAGE;
  const paginatedTerms = filteredTerms.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const totalTerms = terms.length;
  const itTerms = terms.filter(t => t.category === "IT").length;
  const engineeringTerms = terms.filter(t => t.category === "Engineering").length;
  const searchResults = filteredTerms.length;

  const handleAddTerm = async () => {
    if (!newTerm.term || !newTerm.definition) return;

    const tempId = `temp-${Date.now()}`;
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

  const handleExportCSV = () => {
    const headers = ["Term", "Definition", "Category"];
    const csvRows = [
      headers.join(","),
      ...terms.map(term =>
        [
          `"${term.term.replace(/"/g, '""')}"`,
          `"${term.definition.replace(/"/g, '""')}"`,
          `"${term.category}"`
        ].join(",")
      )
    ];
    const csvContent = csvRows.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `glossary-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());

      // Skip header row if it exists
      const startIndex = lines[0]?.toLowerCase().includes("term") ? 1 : 0;

      let added = 0;
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];
      const updatedTerms: GlossaryTerm[] = [...terms];

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV line (handle quoted fields)
        const matches = line.match(/("[^"]*"|[^,]+)/g);

        if (!matches || matches.length < 2) {
          failed++;
          errors.push(`Line ${i + 1}: Invalid format`);
          continue;
        }

        const termName = matches[0]?.replace(/^"|"$/g, "").replace(/""/g, '"').trim().toUpperCase();
        const definition = matches[1]?.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
        const category = normalizeCategory(
          matches[2]?.replace(/^"|"$/g, "").trim() || "General"
        );

        if (!termName || !definition) {
          failed++;
          errors.push(`Line ${i + 1}: Missing term or definition`);
          continue;
        }

        // Check for existing term (case-insensitive)
        const existingTermIndex = updatedTerms.findIndex(
          t => t.term.toUpperCase() === termName && normalizeCategory(t.category) === category
        );

        try {
          if (existingTermIndex !== -1) {
            // Update existing term
            const existingTerm = updatedTerms[existingTermIndex];
            const response = await glossaryApi.updateTerm(existingTerm.id, {
              definition,
              categoryId: category,
              department: category === "IT" ? "IT" : category === "Engineering" ? "Engineering" : "Both",
            });

            if (response.data?.term || response.success) {
              updatedTerms[existingTermIndex] = {
                ...existingTerm,
                definition,
                category,
              };
              updated++;
            } else {
              failed++;
              errors.push(`Line ${i + 1}: Failed to update "${termName}"`);
            }
          } else {
            // Create new term
            const response = await glossaryApi.createTerm({
              term: termName,
              definition,
              categoryId: category,
              department: category === "IT" ? "IT" : category === "Engineering" ? "Engineering" : "Both",
            });

            if (response.data?.term) {
              updatedTerms.push({
                id: response.data.term.id,
                term: termName,
                definition,
                category,
              });
              added++;
            } else {
              failed++;
              errors.push(`Line ${i + 1}: Failed to save "${termName}"`);
            }
          }
        } catch (err) {
          failed++;
          errors.push(`Line ${i + 1}: Error saving "${termName}"`);
        }
      }

      // Update state with all terms
      setTerms(updatedTerms);

      // Create result message
      const successCount = added + updated;
      setImportResults({
        success: successCount,
        failed,
        errors: [
          ...(added > 0 ? [`${added} new term${added !== 1 ? 's' : ''} added`] : []),
          ...(updated > 0 ? [`${updated} existing term${updated !== 1 ? 's' : ''} updated`] : []),
          ...errors.slice(0, 3)
        ]
      });
    } catch (err) {
      console.error("Failed to import CSV:", err);
      setImportResults({ success: 0, failed: 1, errors: ["Failed to read file"] });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadTemplate = () => {
    const template = `Term,Definition,Category\nAPI,"Application Programming Interface - A set of protocols for building software",IT\nHVAC,"Heating Ventilation and Air Conditioning",Engineering\nSLA,"Service Level Agreement",General`;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "glossary-template.csv";
    link.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        // Create a synthetic event to reuse the existing handler
        const syntheticEvent = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleImportCSV(syntheticEvent);
      } else {
        setImportResults({ success: 0, failed: 1, errors: ["Please upload a CSV file"] });
      }
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
          <Button onClick={() => setShowImportDialog(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleExportCSV} variant="outline" disabled={terms.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
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
        {paginatedTerms.map((term) => (
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

      {/* Pagination */}
      {filteredTerms.length > TERMS_PER_PAGE && (
        <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTerms.length)} of {filteredTerms.length} terms
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                const showEllipsis = page === 2 && currentPage > 3 || page === totalPages - 1 && currentPage < totalPages - 2;

                if (showEllipsis && !showPage) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }

                if (!showPage) return null;

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 ${currentPage === page ? "bg-black hover:bg-gray-800" : ""}`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredTerms.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No terms found matching your search criteria.</p>
        </Card>
      )}

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) setImportResults(null);
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Terms from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import glossary terms. The file should have columns: Term, Definition, Category (IT/Engineering/General).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Need a template?</p>
                  <p className="text-sm text-blue-700 mb-2">Download our CSV template with example entries.</p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                id="csv-upload"
              />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className={`text-sm ${isDragging ? "text-blue-600 font-medium" : "text-gray-600"}`}>
                  {isDragging ? "Drop your CSV file here" : "Click to upload"}
                </span>
                <p className="text-xs text-gray-500 mt-1">CSV files only</p>
              </label>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Select File"
                )}
              </Button>
            </div>

            {/* Import Results */}
            {importResults && (
              <div className={`rounded-lg p-4 ${importResults.failed === 0
                ? "bg-green-50 border border-green-200"
                : importResults.success === 0
                  ? "bg-red-50 border border-red-200"
                  : "bg-yellow-50 border border-yellow-200"
                }`}>
                <div className="flex items-start gap-3">
                  {importResults.failed === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className={`w-5 h-5 ${importResults.success === 0 ? "text-red-600" : "text-yellow-600"}`} />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {importResults.success} term{importResults.success !== 1 ? "s" : ""} imported successfully
                      {importResults.failed > 0 && `, ${importResults.failed} failed`}
                    </p>
                    {importResults.errors.length > 0 && (
                      <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                        {importResults.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportResults(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
