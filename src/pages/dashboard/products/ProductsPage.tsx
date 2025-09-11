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
import { Search, MoreHorizontal, Plus, Edit, Trash2, Eye, X } from "lucide-react"
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
  // New fields from backend
  original_price?: number
  discountPrice?: number
  isOnSale?: boolean
  currency?: string
  priceFormatted?: string
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
  // new fields
  sku: "",
  original_price: "",
  discountPrice: "",
  is_on_sale: false,
  currency: "",
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
  // new fields
  sku: "",
  original_price: "",
  discountPrice: "",
  is_on_sale: false,
  currency: "",
  })
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [removedExistingImages, setRemovedExistingImages] = useState<string[]>([])

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
  // Add Tag Modal State
  const [isAddTagOpen, setIsAddTagOpen] = useState(false)
  const [addTagLoading, setAddTagLoading] = useState(false)
  const [addTagValue, setAddTagValue] = useState("")

  useEffect(() => {
    fetchCategories()
    fetchProducts(1)
  }, [])

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true)
  // Ensure auth token is set for this request (if available)
  const token = localStorage.getItem("auth_token")
  if (token) apiService.setAuthToken(token)
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

  const metaSources = [top, top?.data, top?.meta, top?.pagination, top?.error]
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
        categoryId: item.productCategoryId ?? item?.category_id ?? item?.categoryId ?? null,
        original_price: item.productoriginal_price ?? undefined,
        discountPrice: item.productDiscountPrice ?? undefined,
        isOnSale: (item.isProductOnSale ?? 0) === 1,
        currency: item.currency ?? undefined,
        priceFormatted: item.priceFormatted ?? undefined,
      }))
      setProducts(mappedProducts)
      // store raw items for view modal
      const rawMap: Record<number, any> = {}
      items.forEach((it: any) => {
        if (it?.productId != null) rawMap[Number(it.productId)] = it
      })
      setRawProducts(rawMap)
      // pagination meta (robust fallbacks if not present)
      const current = Number(meta.current_page ?? page) || 1
  const per = Number((meta.per_page ?? items.length) || 15)
      const totalCount = Number(meta.total ?? items.length)
      let last = Number(meta.last_page)
      if (!last || !Number.isFinite(last)) {
        // Derive last page from total/per_page if API didn't provide it
        last = per > 0 ? Math.ceil(totalCount / per) : 1
      }
      setCurrentPage(current)
      setPerPage(per)
      setTotal(totalCount)
      setLastPage(last)
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
    if (files.length === 0) return
    setAddForm((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }))
    // Append previews to keep alignment with files
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))])
    // Reset input so selecting the same file again re-triggers onChange
    e.currentTarget.value = ""
  }

  // Remove an image from Add form by index
  const removeAddImageAt = (index: number) => {
    setAddForm((prev) => {
      const nextFiles = prev.images.slice()
      nextFiles.splice(index, 1)
      return { ...prev, images: nextFiles }
    })
    setImagePreviews((prev) => {
      const toRemove = prev[index]
      if (toRemove && toRemove.startsWith("blob:")) {
        try { URL.revokeObjectURL(toRemove) } catch {}
      }
      const next = prev.slice()
      next.splice(index, 1)
      return next
    })
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
  sku: "",
  original_price: "",
  discountPrice: "",
  is_on_sale: false,
  currency: "",
    })
    setImagePreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLoading(true)
    try {
      // Require original price
      if (!addForm.original_price || Number(addForm.original_price) < 0) {
        toast({ title: "Validation", description: "Original Price is required.", variant: "destructive" })
        setAddLoading(false)
        return
      }
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
      // New pricing fields (send canonical and aliases)
      if (addForm.original_price !== "") {
        formData.append("original_price", addForm.original_price)
        formData.append("productOriginalPrice", addForm.original_price)
        formData.append("productoriginal_price", addForm.original_price)
      }
      if (addForm.discountPrice !== "") formData.append("productDiscountPrice", addForm.discountPrice)
      formData.append("isProductOnSale", addForm.is_on_sale ? "1" : "0")
      if (addForm.currency) formData.append("currency", addForm.currency)
      formData.append("quantity", addForm.quantity)
  // Also include productAvailableQuantity alias
  formData.append("productAvailableQuantity", addForm.quantity)
      formData.append("is_active", addForm.is_active ? "1" : "0")
      formData.append("is_private", addForm.is_private ? "1" : "0")
  // Also include isProductActive / isProductPrivate aliases
  formData.append("isProductActive", addForm.is_active ? "1" : "0")
  formData.append("isProductPrivate", addForm.is_private ? "1" : "0")
      // SKU
      if (addForm.sku) {
        formData.append("productSku", addForm.sku)
        formData.append("sku", addForm.sku)
      }
      if (addForm.productCategoryId) {
        const catId = String(Number(addForm.productCategoryId))
        formData.append("productCategoryId", catId)
        // also send alias for compatibility
        formData.append("category_id", catId)
      }
      if (addForm.productVersionNumber) formData.append("productVersionNumber", addForm.productVersionNumber)
  // tags are handled via Add Tag modal
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
      price: String(raw?.productPrice),
      quantity: String(product.stock),
      is_active: product.status === "active",
      is_private: false, // You may need to map this from API if available
      images: [],
      existingImages: product.images || [],
      productCategoryId: product.categoryId != null ? String(product.categoryId) : "",
      productVersionNumber: raw?.productVersionNumber != null ? String(raw.productVersionNumber) : "",
  tagsString: "",
  sku: product.sku ?? raw?.productSku ?? "",
  original_price: String(raw?.productOriginalPrice ?? ""),
  discountPrice: String(raw?.productDiscountPrice ?? product.discountPrice ?? ""),
  is_on_sale: (raw?.isProductOnSale ?? (product.isOnSale ? 1 : 0)) === 1,
  currency: String(raw?.currency ?? product.currency ?? ""),
    })
  // Start with no new image previews; existing are shown from existingImages
  setEditImagePreviews([])
  setRemovedExistingImages([])
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
    if (files.length === 0) return
    setEditForm((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }))
    setEditImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))])
    if (e.currentTarget) e.currentTarget.value = ""
  }

  // Remove an existing (server) image in Edit form by index
  const removeExistingEditImageAt = (index: number) => {
    setEditForm((prev) => {
      const imgs = prev.existingImages.slice()
      const [removed] = imgs.splice(index, 1)
      if (removed) setRemovedExistingImages((old) => [...old, removed])
      return { ...prev, existingImages: imgs }
    })
  }

  // Remove a newly-added (local) image in Edit form by index
  const removeNewEditImageAt = (index: number) => {
    setEditForm((prev) => {
      const files = prev.images.slice()
      files.splice(index, 1)
      return { ...prev, images: files }
    })
    setEditImagePreviews((prev) => {
      const toRemove = prev[index]
      if (toRemove && toRemove.startsWith("blob:")) {
        try { URL.revokeObjectURL(toRemove) } catch {}
      }
      const next = prev.slice()
      next.splice(index, 1)
      return next
    })
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
  sku: "",
  original_price: "",
  discountPrice: "",
  is_on_sale: false,
  currency: "",
    })
    setEditImagePreviews([])
  setRemovedExistingImages([])
    if (editFileInputRef.current) editFileInputRef.current.value = ""
  }

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      // Require original price
      if (!editForm.original_price || Number(editForm.original_price) < 0) {
        toast({ title: "Validation", description: "Original Price is required.", variant: "destructive" })
        setEditLoading(false)
        return
      }
    const payload: any = {
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
  // tags are handled via Add Tag modal
        // images: not supported in JSON PATCH, only for FormData
  ...(editForm.sku && { productSku: editForm.sku, sku: editForm.sku }),
  ...(editForm.original_price !== "" && {
    original_price: Number(editForm.original_price),
    productOriginalPrice: Number(editForm.original_price),
    productoriginal_price: Number(editForm.original_price),
  }),
  ...(editForm.discountPrice !== "" && { productDiscountPrice: Number(editForm.discountPrice), discountPrice: Number(editForm.discountPrice) }),
  isProductOnSale: editForm.is_on_sale ? 1 : 0,
  is_on_sale: editForm.is_on_sale ? 1 : 0,
  ...(editForm.currency && { currency: editForm.currency }),
      }

      // If user removed any existing images, include hints for backend to remove them
      if (removedExistingImages.length > 0) {
        payload.removedImageUrls = removedExistingImages
        payload.removeImageUrls = removedExistingImages
        payload.remove_images = removedExistingImages
      }

      // Add alias category_id for compatibility if category provided
      if (editForm.productCategoryId) {
        payload.category_id = Number(editForm.productCategoryId)
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
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={addForm.sku}
                  onChange={handleAddChange}
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
                  <Label htmlFor="quantity">Quantity in Stock</Label>
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
                  <Label htmlFor="original_price">Original Price</Label>
                  <Input
                    id="original_price"
                    name="original_price"
                    type="number"
                    min="0"
                    value={addForm.original_price}
                    onChange={handleAddChange}
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="discountPrice">Discount Price</Label>
                  <Input
                    id="discountPrice"
                    name="discountPrice"
                    type="number"
                    min="0"
                    value={addForm.discountPrice}
                    onChange={handleAddChange}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    value={addForm.currency}
                    onChange={handleAddChange}
                    placeholder="e.g., USD"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_on_sale"
                    name="is_on_sale"
                    type="checkbox"
                    checked={addForm.is_on_sale}
                    onChange={handleAddChange}
                  />
                  <Label htmlFor="is_on_sale">On Sale</Label>
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
                    <div key={idx} className="relative w-16 h-16">
                      <img
                        src={src}
                        alt={`preview-${idx}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => removeAddImageAt(idx)}
                        className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
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
                    <div className="text-xs text-muted-foreground">Original Price</div>
                    <div className="font-medium">{viewProduct.productOriginalPrice ?? viewProduct.originalPrice ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Discount Price</div>
                    <div className="font-medium">{viewProduct.productDiscountPrice ?? viewProduct.discountPrice ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Currency</div>
                    <div className="font-medium">{viewProduct.currency ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">On Sale</div>
                    <div className="font-medium">{(viewProduct.isProductOnSale ?? 0) === 1 ? "Yes" : "No"}</div>
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

                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {tags.length ? (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setIsAddTagOpen(true)}>
                          Add Tag
                        </Button>
                      </div>
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

        {/* Add Tag Modal */}
        <Dialog open={isAddTagOpen} onOpenChange={(open) => { setIsAddTagOpen(open); if (!open) { setAddTagValue("") } }}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Add Tags</DialogTitle>
              <DialogDescription>Add one or more tags to this product. Separate multiple with commas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="add_tags_input">Tags</Label>
                <Input
                  id="add_tags_input"
                  placeholder="e.g., French, Bread"
                  value={addTagValue}
                  onChange={(e) => setAddTagValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsAddTagOpen(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={addTagLoading}
                onClick={async () => {
                  if (!viewProduct?.productId) return
                  const tags = addTagValue
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                  if (tags.length === 0) return
                  try {
                    setAddTagLoading(true)
                    const token = localStorage.getItem('auth_token')
                    if (token) apiService.setAuthToken(token)
                    await apiService.post(`/admins/products/${viewProduct.productId}/product-tags`, { tags })
                    toast({ title: 'Tags added' })
                    setIsAddTagOpen(false)
                    setAddTagValue('')
                    // Refresh current page and reopen view to reflect new tags
                    await fetchProducts(currentPage)
                    const updated = rawProducts[Number(viewProduct.productId)]
                    setViewProduct(updated || null)
                  } catch (err: any) {
                    toast({ title: 'Failed to add tags', description: err?.message || 'Error', variant: 'destructive' })
                  } finally {
                    setAddTagLoading(false)
                  }
                }}
              >
                {addTagLoading ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
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
                <Label htmlFor="edit_sku">SKU</Label>
                <Input
                  id="edit_sku"
                  name="sku"
                  value={editForm.sku}
                  onChange={handleEditChange}
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
                  <Label htmlFor="edit_quantity">Quantity in Stock</Label>
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
                  <Label htmlFor="edit_original_price">Original Price</Label>
                  <Input
                    id="edit_original_price"
                    name="original_price"
                    type="number"
                    min="0"
                    value={editForm.original_price}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="edit_discountPrice">Discount Price</Label>
                  <Input
                    id="edit_discountPrice"
                    name="discountPrice"
                    type="number"
                    min="0"
                    value={editForm.discountPrice}
                    onChange={handleEditChange}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="edit_currency">Currency</Label>
                  <Input
                    id="edit_currency"
                    name="currency"
                    value={editForm.currency}
                    onChange={handleEditChange}
                    placeholder="e.g., USD"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edit_is_on_sale"
                    name="is_on_sale"
                    type="checkbox"
                    checked={editForm.is_on_sale}
                    onChange={handleEditChange}
                  />
                  <Label htmlFor="edit_is_on_sale">On Sale</Label>
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
                  {/* Existing server images */}
                  {editForm.existingImages.map((src, idx) => (
                    <div key={`existing-${idx}`} className="relative w-16 h-16">
                      <img
                        src={src}
                        alt={`existing-${idx}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        aria-label="Remove existing image"
                        onClick={() => removeExistingEditImageAt(idx)}
                        className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {/* Newly added local images */}
                  {editImagePreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative w-16 h-16">
                      <img
                        src={src}
                        alt={`preview-edit-${idx}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => removeNewEditImageAt(idx)}
                        className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
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
                        {typeof product.price === "number"
                          ? product.priceFormatted || (product.currency ? `${product.currency} ${product.price.toFixed(2)}` : `$${product.price.toFixed(2)}`)
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>{product.stock}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>
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

