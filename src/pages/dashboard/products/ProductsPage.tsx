  import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Plus, Edit, Trash2, Eye } from "lucide-react"
import { apiService } from "@/lib/api-service"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  status: "active" | "inactive"
  created_at: string
  images?: string[] // Add images field (array of URLs)
  sku?: string
  isPrivate?: boolean
  tags?: string[]
  categoryId?: number | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    is_active: false,
    is_private: false,
  images: [] as File[],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
  })
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Product Modal State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    quantity: "",
    is_active: false,
    is_private: false,
    images: [] as File[],
  existingImages: [] as string[],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
  })
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [total, setTotal] = useState(0)
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [categoryList, setCategoryList] = useState<{ id: number; name: string }[]>([])
  const [rawProducts, setRawProducts] = useState<Record<number, any>>({})
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [viewProduct, setViewProduct] = useState<any | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchProducts(1)
  }, [])

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
      const response = await apiService.get(`/admins/products?page=${page}`)

      // Normalize common API shapes for items and pagination meta
      const normalize = (res: any) => {
        const top = res ?? {}
        let items: any[] = []

        const candidates = [
          top, // { data: [], current_page, ... }
          top?.data, // { data: [], current_page, ... } OR []
          top?.result,
          top?.results,
        ]

        for (const layer of candidates) {
          if (!layer) continue
          if (Array.isArray(layer)) {
            items = layer
            break
          }
          if (Array.isArray(layer?.data)) {
            items = layer.data
            break
          }
          if (Array.isArray(layer?.items)) {
            items = layer.items
            break
          }
          if (Array.isArray(layer?.records)) {
            items = layer.records
            break
          }
        }

        const metaSources = [top, top?.data, top?.meta, top?.pagination]
        const meta: any = {}
        for (const src of metaSources) {
          if (!src) continue
          if (meta.current_page == null)
            meta.current_page = src.current_page ?? src.currentPage ?? src.page
          if (meta.last_page == null)
            meta.last_page = src.last_page ?? src.lastPage ?? src.total_pages ?? src.totalPages
          if (meta.per_page == null)
            meta.per_page = src.per_page ?? src.perPage ?? src.limit ?? src.page_size ?? src.pageSize
          if (meta.total == null)
            meta.total = src.total ?? src.totalItems ?? src.total_results ?? src.totalResults
        }

        return { items, meta }
      }

      const { items, meta } = normalize(response)

      const mappedProducts: Product[] = items.map((item: any) => ({
        id: item.productId,
        name: item.productName,
        description: item.productDescription ?? item.productSku ?? "",
        price: item.productPrice,
        stock: item.productAvailableQuantity,
        status: item.isProductActive ? "active" : "inactive",
        created_at: item.createdAt || new Date().toISOString(),
        images: item.productImages?.map((img: any) => img.imageUrl || img.url || img.path || img) || [],
        sku: item.productSku,
        isPrivate: !!item.isProductPrivate,
        tags: (item.productTags || [])
          .map((t: any) => (typeof t === "string" ? t : (t?.name ?? t?.tagName ?? t?.label ?? t?.title ?? t?.slug ?? "")))
          .filter(Boolean),
  categoryId: item.productCategoryId ?? null,
      }))
      setProducts(mappedProducts)
      // store raw items for view modal
      const rawMap: Record<number, any> = {}
      items.forEach((it: any) => {
        if (it?.productId != null) rawMap[Number(it.productId)] = it
      })
      setRawProducts(rawMap)
      // pagination meta (fallbacks if not present)
      setCurrentPage(Number(meta.current_page ?? page) || 1)
      setLastPage(Number(meta.last_page ?? 1) || 1)
  setPerPage(Number((meta.per_page ?? mappedProducts.length) || 15))
      setTotal(Number(meta.total ?? mappedProducts.length))
    } catch (error) {
      // Mock data for demonstration
      const mockProducts: Product[] = [
        {
          id: 1,
          name: "Premium Coffee Beans",
          description: "High-quality arabica coffee beans",
          price: 29.99,
          stock: 150,
          status: "active",
          created_at: "2024-01-15T10:30:00Z",
          images: [],
        },
        {
          id: 2,
          name: "Organic Tea Set",
          description: "Collection of organic herbal teas",
          price: 45.0,
          stock: 0,
          status: "inactive",
          created_at: "2024-01-10T09:15:00Z",
          images: [],
        },
      ]
      setProducts(mockProducts)
      setCurrentPage(1)
      setLastPage(1)
      setPerPage(mockProducts.length)
      setTotal(mockProducts.length)
    } finally {
      setLoading(false)
    }
  }

  // Open View Modal with full raw details
  const openViewModal = (product: Product) => {
    const raw = rawProducts[product.id]
    setViewProduct(raw || null)
    setIsViewOpen(true)
  }

  // Fetch categories and build id->name map
  const fetchCategories = async () => {
    try {
      const response = await apiService.get(`/products/product-categories`)
      const list = (response?.data ?? response ?? []) as any[]
  const map: Record<number, string> = {}
  const arr: { id: number; name: string }[] = []
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          const id = item?.id ?? item?.categoryId ?? item?.productCategoryId ?? item?.category_id
          const name = item?.name ?? item?.categoryName ?? item?.title ?? item?.slug ?? ""
          if (id != null) {
    map[Number(id)] = String(name)
    arr.push({ id: Number(id), name: String(name) })
          }
        })
      }
  setCategoryMap(map)
  setCategoryList(arr)
    } catch (e) {
      // ignore; leave empty map
    }
  }

  // Handle Add Product Form Changes
  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    setAddForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }))
  }

  // Handle Images
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAddForm((prev) => ({
      ...prev,
      images: files,
    }))
    // Preview
    setImagePreviews(files.map((file) => URL.createObjectURL(file)))
  }

  // Reset Add Product Form
  const resetAddForm = () => {
    setAddForm({
      name: "",
      description: "",
      price: "",
      quantity: "",
      is_active: false,
      is_private: false,
  images: [],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
    })
    setImagePreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", addForm.name)
      // Also include productName for backend compatibility
      formData.append("productName", addForm.name)
      formData.append("description", addForm.description)
  // Also include productDescription alias
  formData.append("productDescription", addForm.description)
      formData.append("price", addForm.price)
  // Also include productPrice alias
  formData.append("productPrice", addForm.price)
      formData.append("quantity", addForm.quantity)
  // Also include productAvailableQuantity alias
  formData.append("productAvailableQuantity", addForm.quantity)
      formData.append("is_active", addForm.is_active ? "1" : "0")
      formData.append("is_private", addForm.is_private ? "1" : "0")
  // Also include isProductActive / isProductPrivate aliases
  formData.append("isProductActive", addForm.is_active ? "1" : "0")
  formData.append("isProductPrivate", addForm.is_private ? "1" : "0")
      if (addForm.productCategoryId)
        formData.append("productCategoryId", String(Number(addForm.productCategoryId)))
      if (addForm.productVersionNumber) formData.append("productVersionNumber", addForm.productVersionNumber)
      if (addForm.tagsString) {
        addForm.tagsString
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .forEach((t) => formData.append("productTags[]", t))
      }
      addForm.images.forEach((file) => formData.append("images[]", file))

  // Use api service with base URL and token from localStorage
  const token = localStorage.getItem("auth_token")
  if (token) apiService.setAuthToken(token)
  await apiService.postMultipart("/products", formData)

      toast({
        title: "Success",
        description: "Product added successfully.",
      })
      setIsAddOpen(false)
      resetAddForm()
  fetchProducts(currentPage)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add product.",
        variant: "destructive",
      })
    } finally {
      setAddLoading(false)
    }
  }

  // Open Edit Modal and pre-fill fields
  const openEditModal = (product: Product) => {
    const raw = rawProducts[product.id]
    setEditForm({
      id: String(product.id),
      name: product.name,
      description: product.description,
      price: String(product.price),
      quantity: String(product.stock),
      is_active: product.status === "active",
      is_private: false, // You may need to map this from API if available
      images: [],
      existingImages: product.images || [],
      productCategoryId: product.categoryId != null ? String(product.categoryId) : "",
      productVersionNumber: raw?.productVersionNumber != null ? String(raw.productVersionNumber) : "",
      tagsString: (product.tags || []).join(", "),
    })
    setEditImagePreviews(product.images || [])
    setIsEditOpen(true)
  }

  // Handle Edit Product Form Changes
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement
    const { name, value, type } = target
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }))
  }

  // Handle Edit Images
  const handleEditImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setEditForm((prev) => ({
      ...prev,
      images: files,
    }))
    setEditImagePreviews([
      ...(editForm.existingImages || []),
      ...files.map((file) => URL.createObjectURL(file)),
    ])
  }

  // Reset Edit Product Form
  const resetEditForm = () => {
    setEditForm({
      id: "",
      name: "",
      description: "",
      price: "",
      quantity: "",
      is_active: false,
      is_private: false,
      images: [],
  existingImages: [],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
    })
    setEditImagePreviews([])
    if (editFileInputRef.current) editFileInputRef.current.value = ""
  }

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const payload = {
        name: editForm.name,
        productName: editForm.name, // for backend compatibility
        description: editForm.description,
        productDescription: editForm.description,
        price: Number(editForm.price),
        quantity: Number(editForm.quantity),
        is_active: editForm.is_active ? 1 : 0,
        is_private: editForm.is_private ? 1 : 0,
        ...(editForm.productCategoryId && { productCategoryId: Number(editForm.productCategoryId) }),
        ...(editForm.productVersionNumber && { productVersionNumber: Number(editForm.productVersionNumber) }),
        ...(editForm.tagsString && {
          productTags: editForm.tagsString
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
        // images: not supported in JSON PATCH, only for FormData
      }

      // Use /products/{id} endpoint for PATCH
      const response = await apiService.patchJson(`/products/${editForm.id}`, payload)
      console.log("PATCH response:", response)

      toast({
        title: "Success",
        description: "Product updated successfully.",
      })
      setIsEditOpen(false)
      resetEditForm()
  fetchProducts(currentPage)
    } catch (err: any) {
      console.error("Product update error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update product.",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase() ?? "").includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Add Product Modal */}
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetAddForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>Fill in the product details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={addForm.productCategoryId}
                  onValueChange={(val) =>
                    setAddForm((prev) => ({ ...prev, productCategoryId: val }))
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={addForm.name}
                  onChange={handleAddChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={addForm.description}
                  onChange={handleAddChange}
                  required
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    value={addForm.price}
                    onChange={handleAddChange}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={addForm.quantity}
                    onChange={handleAddChange}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="productVersionNumber">Version Number</Label>
                  <Input
                    id="productVersionNumber"
                    name="productVersionNumber"
                    type="number"
                    min="0"
                    value={addForm.productVersionNumber}
                    onChange={handleAddChange}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    name="tagsString"
                    placeholder="e.g., Pizza, Vegan"
                    value={addForm.tagsString}
                    onChange={handleAddChange}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={addForm.is_active}
                    onChange={handleAddChange}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_private"
                    name="is_private"
                    type="checkbox"
                    checked={addForm.is_private}
                    onChange={handleAddChange}
                  />
                  <Label htmlFor="is_private">Private</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="images">Images</Label>
                <Input
                  id="images"
                  name="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImagesChange}
                  ref={fileInputRef}
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {imagePreviews.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`preview-${idx}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addLoading}>
                  {addLoading ? "Adding..." : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Product Modal */}
        <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setViewProduct(null) }}>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
              <DialogDescription>Full product information from the API.</DialogDescription>
            </DialogHeader>
            {viewProduct ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">
                      {categoryMap[viewProduct.productCategoryId] || viewProduct.productCategoryId || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Product Name</div>
                    <div className="font-medium">{viewProduct.productName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">SKU</div>
                    <div className="font-medium">{viewProduct.productSku || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Version</div>
                    <div className="font-medium">{viewProduct.productVersionNumber ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Price</div>
                    <div className="font-medium">{viewProduct.productPrice ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Available Quantity</div>
                    <div className="font-medium">{viewProduct.productAvailableQuantity ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Active</div>
                    <div className="font-medium">{viewProduct.isProductActive ? "Yes" : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Private</div>
                    <div className="font-medium">{viewProduct.isProductPrivate ? "Yes" : "No"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="mt-1 text-sm">{viewProduct.productDescription || "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Tags</div>
                  {(() => {
                    const collectLabels = (arr: any[]): string[] =>
                      arr
                        .map((t: any) => {
                          if (typeof t === "string") return t
                          if (t && typeof t === "object")
                            return (
                              t.name ?? t.tagName ?? t.label ?? t.title ?? t.slug ?? ""
                            )
                          return ""
                        })
                        .filter(Boolean)

                    let tags: string[] = []
                    const rawTags = viewProduct.productTags

                    if (Array.isArray(rawTags)) {
                      tags = collectLabels(rawTags)
                    } else if (typeof rawTags === "string") {
                      tags = rawTags
                        .split(/[|,]/)
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    } else if (rawTags && typeof rawTags === "object") {
                      if (Array.isArray((rawTags as any).data)) tags = collectLabels((rawTags as any).data)
                      else if (Array.isArray((rawTags as any).items)) tags = collectLabels((rawTags as any).items)
                    }

                    // Also merge in tags from the mapped product if available
                    const mapped = products.find(
                      (p) => p.id === Number(viewProduct.productId)
                    )
                    if (mapped?.tags?.length) {
                      tags = Array.from(new Set([...tags, ...mapped.tags]))
                    }

                    return tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )
                  })()}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Images</div>
                  {Array.isArray(viewProduct.productImages) && viewProduct.productImages.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {viewProduct.productImages.map((img: any, i: number) => (
                        <div key={i} className="flex flex-col items-center">
                          <img
                            src={img?.imageUrl || img?.url || img?.path || img}
                            alt={img?.originalName || `image-${i}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          {img?.originalName && (
                            <div className="mt-1 text-[10px] text-muted-foreground max-w-[70px] truncate">
                              {img.originalName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No Images</span>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data to display.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Product Modal */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetEditForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update the product details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProduct} className="space-y-4">
              <div>
                <Label htmlFor="edit_category">Category</Label>
                <Select
                  value={editForm.productCategoryId}
                  onValueChange={(val) =>
                    setEditForm((prev) => ({ ...prev, productCategoryId: val }))
                  }
                >
                  <SelectTrigger id="edit_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_name">Name</Label>
                <Input
                  id="edit_name"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_price">Price</Label>
                  <Input
                    id="edit_price"
                    name="price"
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_quantity">Quantity</Label>
                  <Input
                    id="edit_quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={handleEditChange}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_productVersionNumber">Version Number</Label>
                  <Input
                    id="edit_productVersionNumber"
                    name="productVersionNumber"
                    type="number"
                    min="0"
                    value={editForm.productVersionNumber}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_tags">Tags (comma separated)</Label>
                  <Input
                    id="edit_tags"
                    name="tagsString"
                    placeholder="e.g., Pizza, Vegan"
                    value={editForm.tagsString}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="edit_is_active"
                    name="is_active"
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={handleEditChange}
                  />
                  <Label htmlFor="edit_is_active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edit_is_private"
                    name="is_private"
                    type="checkbox"
                    checked={editForm.is_private}
                    onChange={handleEditChange}
                  />
                  <Label htmlFor="edit_is_private">Private</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="edit_images">Images</Label>
                <Input
                  id="edit_images"
                  name="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleEditImagesChange}
                  ref={editFileInputRef}
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {editImagePreviews.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={`preview-edit-${idx}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>Manage your product catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            

    <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Private</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {product.categoryId != null && categoryMap[product.categoryId]
                          ? categoryMap[product.categoryId]
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">No Image</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {typeof product.price === "number" ? `$${product.price.toFixed(2)}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>{product.stock}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {product.tags && product.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.tags.map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.isPrivate ? "secondary" : "outline"}>
                          {product.isPrivate ? "Private" : "Public"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewModal(product)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(product)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) {
                          const next = currentPage - 1
                          setCurrentPage(next)
                          fetchProducts(next)
                        }
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {(() => {
                    const items: Array<number | "left-ellipsis" | "right-ellipsis"> = []
                    if (lastPage <= 7) {
                      for (let i = 1; i <= lastPage; i++) items.push(i)
                    } else {
                      items.push(1)
                      if (currentPage > 3) items.push("left-ellipsis")
                      const start = Math.max(2, currentPage - 1)
                      const end = Math.min(lastPage - 1, currentPage + 1)
                      for (let i = start; i <= end; i++) items.push(i)
                      if (currentPage < lastPage - 2) items.push("right-ellipsis")
                      items.push(lastPage)
                    }

                    return items.map((it, idx) => {
                      if (it === "left-ellipsis" || it === "right-ellipsis")
                        return (
                          <PaginationItem key={`${it}-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )
                      const pageNum = it as number
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={pageNum === currentPage}
                            onClick={(e) => {
                              e.preventDefault()
                              if (pageNum !== currentPage) {
                                setCurrentPage(pageNum)
                                fetchProducts(pageNum)
                              }
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < lastPage) {
                          const next = currentPage + 1
                          setCurrentPage(next)
                          fetchProducts(next)
                        }
                      }}
                      className={currentPage >= lastPage ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                {total > 0 ? (
                  <>
                    Showing {(currentPage - 1) * perPage + 1} -
                    {Math.min(currentPage * perPage, total)} of {total}
                  </>
                ) : (
                  <>No results</>
                )}
              </div>
            </div>
           
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

