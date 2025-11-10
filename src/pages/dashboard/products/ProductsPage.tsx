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
  productCategories?: {
    id: number
    name: string
  }
  // New fields from backend
  original_price?: number
  discount_price?: number
  isOnSale?: boolean
  currency?: string
  priceFormatted?: string
  // Extended backend fields (for view/edit/add consistency)
  nutritionFacts?: {
    calories?: number | string
    fat?: number | string
    protein?: number | string
    [key: string]: any
  }
  ingredientsMain?: Array<{ name?: string; emoji?: string; amount?: string }>
  ingredientsExtra?: Array<{ name?: string; emoji?: string; amount?: string }>
  ingredientsNotIncluded?: string[]
  utensils?: string[]
  dessertSuggestions?: Array<{ name?: string; image?: string; price?: number | string }>
  servingOptions?: Array<{ servings?: number | string; label?: string; price?: number | string }>
  productVersionNumber?: number | string
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
    quantity: "",
    is_active: false,
    is_private: false,
    images: [] as File[],
    productCategoryId: "",
    productVersionNumber: "",
    tagsString: "",
    original_price: "",
    discount_price: "",
    is_on_sale: false,
    currency: "",
    nutritionFacts: { calories: "", fat: "", protein: "" },
  ingredientsMain: [{ name: "", emoji: "", amount: "", imageFile: null as File | null }] as Array<{ name: string; emoji: string; amount: string; imageFile: File | null }>,
  ingredientsExtra: [] as Array<{ name: string; emoji: string; amount: string; imageFile: File | null }>,
    ingredientsNotIncluded: [] as string[],
    utensils: [] as string[],
    dessertSuggestions: [] as Array<{ name: string; price: string; imageFile: File | null; imagePreview?: string }>,
    servingOptions: [] as Array<{ servings: string; label: string; price: string }>,
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
    quantity: "",
    is_active: false,
    is_private: false,
    images: [] as File[],
    existingImages: [] as string[],
    productCategoryId: "",
    productVersionNumber: "",
    tagsString: "",
    original_price: "",
    discount_price: "",
    is_on_sale: false,
    currency: "",
    nutritionFacts: { calories: "", fat: "", protein: "" },
  ingredientsMain: [{ name: "", emoji: "", amount: "", imageFile: null as File | null }] as Array<{ name: string; emoji: string; amount: string; imageFile: File | null }>,
  ingredientsExtra: [] as Array<{ name: string; emoji: string; amount: string; imageFile: File | null }>,
    ingredientsNotIncluded: [] as string[],
    utensils: [] as string[],
    dessertSuggestions: [] as Array<{ name: string; price: string; imageFile: File | null; imagePreview?: string }>,
    servingOptions: [] as Array<{ servings: string; label: string; price: string }>,
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
    // Enforce allowed per-page values on initial load
    if (![15, 25, 50, 100].includes(perPage)) setPerPage(15)
    fetchProducts(1)
  }, [])

  // Fetch products using backend-supported pagination param `per_page`
  const fetchProducts = async (page = 1, size = perPage) => {
    try {
      setLoading(true)
  // Ensure auth token is set for this request (if available)
  const token = localStorage.getItem("auth_token")
  if (token) apiService.setAuthToken(token)
      // Build URL based on rules:
      // - If size (perPage) === 15 and page === 1 -> send bare /admins/products (no query params)
      // - If size === 15 and page > 1 -> send ?page=page
      // - If size !== 15 -> send ?page=page&per_page=size (even if page=1)
      const allowed = [15, 25, 50, 100]
      const sizeInt = Number(size)
      const pageInt = Number(page)
      const effectiveSize = allowed.includes(sizeInt) ? sizeInt : 15
      let endpoint = '/admins/products'
      if (effectiveSize === 15) {
        if (pageInt > 1) {
          endpoint += `?page=${pageInt}`
        }
      } else {
        endpoint += `?page=${pageInt}`
        endpoint += `&per_page=${effectiveSize}`
      }
      const response = await apiService.get(endpoint)

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

      const mappedProducts: Product[] = items.map((item: any) => {
        const firstCategory = Array.isArray(item.productCategories) && item.productCategories.length > 0
          ? item.productCategories[0]
          : null
        const categoryId = item.productCategoryId
          ?? item?.category_id
          ?? item?.categoryId
          ?? (firstCategory?.id != null ? Number(firstCategory.id) : null)
        const simpleCategory = firstCategory
          ? { id: Number(firstCategory.id), name: String(firstCategory.name ?? firstCategory.slug ?? "") }
          : undefined

        return {
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
          categoryId,
          productCategories: simpleCategory,
          original_price: item.productoriginal_price ?? undefined,
          discount_price: item.productdiscount_price ?? undefined,
          isOnSale: (item.isProductOnSale ?? 0) === 1,
          currency: item.currency ?? undefined,
          priceFormatted: item.priceFormatted ?? undefined,
          // Add any additional fields you need to map here
          nutritionFacts: item.nutritionFacts ?? undefined,
          ingredientsMain: item.ingredientsMain ?? undefined,
          ingredientsExtra: item.ingredientsExtra ?? undefined,
          ingredientsNotIncluded: item.ingredientsNotIncluded ?? undefined,
          utensils: item.utensils ?? undefined,
          dessertSuggestions: item.dessertSuggestions ?? undefined,
          servingOptions: item.servingOptions ?? undefined,
          productVersionNumber: item.productVersionNumber ?? undefined,
          
        }
      })
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
  // Keep user-selected perPage; do not override with backend meta
      setTotal(totalCount)
      setLastPage(last)
    } catch (error) {
      // // Mock data for demonstration
      // const mockProducts: Product[] = [
      //   {
      //     id: 1,
      //     name: "Premium Coffee Beans",
      //     productCategories: [{id:1, name:"Beverages"}],
      //     description: "High-quality arabica coffee beans",
      //     price: 29.99,
      //     stock: 150,
      //     status: "active",
      //     created_at: "2024-01-15T10:30:00Z",
      //     images: [],
      //   },
      //   {
      //     id: 2,
      //     name: "Organic Tea Set",
      //     productCategories: [{id:2, name:"Beverages"}],
      //     description: "Collection of organic herbal teas",
      //     price: 45.0,
      //     stock: 0,
      //     status: "inactive",
      //     created_at: "2024-01-10T09:15:00Z",
      //     images: [],
      //   },
      // ]
      // setProducts(mockProducts)
      // setCurrentPage(1)
      // setLastPage(1)
      // setPerPage(mockProducts.length)
      // setTotal(mockProducts.length)
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
      quantity: "",
      is_active: false,
      is_private: false,
  images: [],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
  original_price: "",
  discount_price: "",
  is_on_sale: false,
  currency: "",
  nutritionFacts: { calories: "", fat: "", protein: "" },
  ingredientsMain: [{ name: "", emoji: "", amount: "", imageFile: null }],
  ingredientsExtra: [],
  ingredientsNotIncluded: [],
  utensils: [],
  dessertSuggestions: [],
  servingOptions: [],
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
      // New pricing fields (send canonical and aliases)
      if (addForm.original_price !== "") {
        formData.append("original_price", addForm.original_price)
        formData.append("productOriginalPrice", addForm.original_price)
        formData.append("productoriginal_price", addForm.original_price)
      }
      if (addForm.discount_price !== "") formData.append("productdiscount_price", addForm.discount_price)
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
      // Category (send as many compatible shapes as possible)
      if (addForm.productCategoryId) {
        const catIdNum = Number(addForm.productCategoryId)
        const catId = String(catIdNum)
        const catName = categoryMap[catIdNum]
        // primary ids
        formData.append("productCategoryId", catId)
        formData.append("category_id", catId)
        // relationship sync with array-of-objects
        formData.append("productCategories[0][id]", catId)
        if (catName) formData.append("productCategories[0][name]", String(catName))
        // common id-array aliases
        formData.append("productCategories[]", catId)
        formData.append("product_category_ids[]", catId)
        formData.append("productCategoryIds[]", catId)
        formData.append("category_ids[]", catId)
        formData.append("categories[]", catId)
        // JSON payload variants that some backends expect
        const pcJson = JSON.stringify([{ id: catIdNum, name: catName ?? undefined }])
        formData.append("productCategories", pcJson)
        formData.append("product_categories", pcJson)
      }
      if (addForm.productVersionNumber) formData.append("productVersionNumber", addForm.productVersionNumber)
  // tags are handled via Add Tag modal
      addForm.images.forEach((file) => formData.append("images[]", file))

      // Nutrition facts (send camelCase and snake_case for compatibility)
      if (addForm.nutritionFacts.calories !== "") {
        formData.append("nutritionFacts[calories]", addForm.nutritionFacts.calories)
        formData.append("nutrition_facts[calories]", addForm.nutritionFacts.calories)
      }
      if (addForm.nutritionFacts.fat !== "") {
        formData.append("nutritionFacts[fat]", addForm.nutritionFacts.fat)
        formData.append("nutrition_facts[fat]", addForm.nutritionFacts.fat)
      }
      if (addForm.nutritionFacts.protein !== "") {
        formData.append("nutritionFacts[protein]", addForm.nutritionFacts.protein)
        formData.append("nutrition_facts[protein]", addForm.nutritionFacts.protein)
      }

      // Ingredients main (use snake_case per Postman and include optional image)
      addForm.ingredientsMain.forEach((ing, i) => {
        if (ing.name !== "") formData.append(`ingredients_main[${i}][name]`, ing.name)
        if (ing.emoji !== "") formData.append(`ingredients_main[${i}][emoji]`, ing.emoji)
        if (ing.amount !== "") formData.append(`ingredients_main[${i}][amount]`, ing.amount)
        if (ing.imageFile) formData.append(`ingredients_main[${i}][image]`, ing.imageFile)
      })

      // Ingredients extra (snake_case + image)
      addForm.ingredientsExtra.forEach((ing, i) => {
        if (ing.name !== "") formData.append(`ingredients_extra[${i}][name]`, ing.name)
        if (ing.emoji !== "") formData.append(`ingredients_extra[${i}][emoji]`, ing.emoji)
        if (ing.amount !== "") formData.append(`ingredients_extra[${i}][amount]`, ing.amount)
        if (ing.imageFile) formData.append(`ingredients_extra[${i}][image]`, ing.imageFile)
      })

      // Ingredients not included (snake_case)
      addForm.ingredientsNotIncluded.forEach((val, i) => {
        if (val !== "") formData.append(`ingredients_not_included[${i}]`, val)
      })

      // Utensils
      addForm.utensils.forEach((val, i) => {
        if (val !== "") formData.append(`utensils[${i}]`, val)
      })

      // Dessert suggestions
      addForm.dessertSuggestions.forEach((d, i) => {
        if (d.name !== "") formData.append(`dessertSuggestions[${i}][name]`, d.name)
        if (d.price !== "") formData.append(`dessertSuggestions[${i}][price]`, d.price)
        if (d.imageFile) formData.append(`dessertSuggestions[${i}][image]`, d.imageFile)
      })

      // Serving options
      addForm.servingOptions.forEach((s, i) => {
        if (s.servings !== "") formData.append(`servingOptions[${i}][servings]`, s.servings)
        if (s.label !== "") formData.append(`servingOptions[${i}][label]`, s.label)
        if (s.price !== "") formData.append(`servingOptions[${i}][price]`, s.price)
      })

  // Use api service with base URL and token from localStorage
  const token = localStorage.getItem("auth_token")
  if (token) apiService.setAuthToken(token)
  // Also include is_on_sale for compatibility
  formData.append("is_on_sale", addForm.is_on_sale ? "1" : "0")

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
    // Normalize discount & original price from any possible backend field names
    const rawOriginal = raw?.productOriginalPrice ?? raw?.productoriginal_price ?? raw?.original_price ?? raw?.originalPrice ?? (product as any).original_price ?? (product as any).originalPrice
    const rawDiscount = raw?.productDiscountPrice ?? raw?.productdiscount_price ?? raw?.discount_price ?? raw?.discountPrice ?? (product as any).discount_price ?? (product as any).discountPrice
  setEditForm({
      id: String(product.id),
      name: product.name,
      description: product.description,
      quantity: String(product.stock),
      is_active: product.status === "active",
      is_private: false, // You may need to map this from API if available
      images: [],
      existingImages: product.images || [],
      productCategoryId: product.categoryId != null ? String(product.categoryId) : "",
      productVersionNumber: raw?.productVersionNumber != null ? String(raw.productVersionNumber) : "",
  tagsString: "",
  original_price: rawOriginal != null && rawOriginal !== "" ? String(rawOriginal) : "",
  discount_price: rawDiscount != null && rawDiscount !== "" ? String(rawDiscount) : "",
  is_on_sale: (raw?.isProductOnSale ?? (product.isOnSale ? 1 : 0)) === 1,
  currency: String(raw?.currency ?? product.currency ?? ""),
  nutritionFacts: {
    calories: String(raw?.nutritionFacts?.calories ?? ""),
    fat: String(raw?.nutritionFacts?.fat ?? ""),
    protein: String(raw?.nutritionFacts?.protein ?? ""),
  },
  ingredientsMain: Array.isArray(raw?.ingredientsMain)
    ? raw.ingredientsMain.map((r: any) => ({
        name: String(r?.name ?? ""),
        emoji: String(r?.emoji ?? ""),
        amount: String(r?.amount ?? ""),
        imageFile: null,
      }))
    : [{ name: "", emoji: "", amount: "", imageFile: null }],
  ingredientsExtra: Array.isArray(raw?.ingredientsExtra)
    ? raw.ingredientsExtra.map((r: any) => ({
        name: String(r?.name ?? ""),
        emoji: String(r?.emoji ?? ""),
        amount: String(r?.amount ?? ""),
        imageFile: null,
      }))
    : [],
  ingredientsNotIncluded: Array.isArray(raw?.ingredientsNotIncluded)
    ? raw.ingredientsNotIncluded.map((s: any) => String(s))
    : [],
  utensils: Array.isArray(raw?.utensils) ? raw.utensils.map((s: any) => String(s)) : [],
  dessertSuggestions: Array.isArray(raw?.dessertSuggestions)
    ? raw.dessertSuggestions.map((d: any) => ({
        name: String(d?.name ?? ""),
        price: String(d?.price ?? ""),
        imageFile: null,
      }))
    : [],
  servingOptions: Array.isArray(raw?.servingOptions)
    ? raw.servingOptions.map((s: any) => ({
        servings: String(s?.servings ?? ""),
        label: String(s?.label ?? ""),
        price: String(s?.price ?? ""),
      }))
    : [],
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
      quantity: "",
      is_active: false,
      is_private: false,
      images: [],
  existingImages: [],
  productCategoryId: "",
  productVersionNumber: "",
  tagsString: "",
  original_price: "",
  discount_price: "",
  is_on_sale: false,
  currency: "",
  nutritionFacts: { calories: "", fat: "", protein: "" },
  ingredientsMain: [{ name: "", emoji: "", amount: "", imageFile: null }],
  ingredientsExtra: [],
  ingredientsNotIncluded: [],
  utensils: [],
  dessertSuggestions: [],
  servingOptions: [],
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
      // Switch to multipart + method override so we can send arrays properly
      const formData = new FormData()
      formData.append("_method", "PATCH")
      formData.append("name", editForm.name)
      formData.append("productName", editForm.name)
      formData.append("description", editForm.description)
      formData.append("productDescription", editForm.description)
      formData.append("quantity", String(editForm.quantity))
      formData.append("is_active", editForm.is_active ? "1" : "0")
      formData.append("isProductActive", editForm.is_active ? "1" : "0")
      formData.append("is_private", editForm.is_private ? "1" : "0")
      formData.append("isProductPrivate", editForm.is_private ? "1" : "0")
      // Category (send as many compatible shapes as possible)
      if (editForm.productCategoryId) {
        const catIdNum = Number(editForm.productCategoryId)
        const catId = String(catIdNum)
        const catName = categoryMap[catIdNum]
        // primary ids
        formData.append("productCategoryId", catId)
        formData.append("category_id", catId)
        // relationship sync with array-of-objects
        formData.append("productCategories[0][id]", catId)
        if (catName) formData.append("productCategories[0][name]", String(catName))
        // common id-array aliases
        formData.append("productCategories[]", catId)
        formData.append("product_category_ids[]", catId)
        formData.append("productCategoryIds[]", catId)
        formData.append("category_ids[]", catId)
        formData.append("categories[]", catId)
        // JSON payload variants that some backends expect
        const pcJson = JSON.stringify([{ id: catIdNum, name: catName ?? undefined }])
        formData.append("productCategories", pcJson)
        formData.append("product_categories", pcJson)
      }
      if (editForm.productVersionNumber) formData.append("productVersionNumber", String(editForm.productVersionNumber))
      if (editForm.original_price !== "") {
        formData.append("original_price", String(editForm.original_price))
        formData.append("productOriginalPrice", String(editForm.original_price))
        formData.append("productoriginal_price", String(editForm.original_price))
      }
      if (editForm.discount_price !== "") {
        formData.append("productdiscount_price", String(editForm.discount_price))
        formData.append("discount_price", String(editForm.discount_price))
      }
      formData.append("isProductOnSale", editForm.is_on_sale ? "1" : "0")
      formData.append("is_on_sale", editForm.is_on_sale ? "1" : "0")
      if (editForm.currency) formData.append("currency", editForm.currency)

      // Removed server images
      removedExistingImages.forEach((url) => {
        formData.append("removedImageUrls[]", url)
        formData.append("removeImageUrls[]", url)
        formData.append("remove_images[]", url)
      })

      // New images
      editForm.images.forEach((f) => formData.append("images[]", f))

      // Nutrition facts (send camelCase and snake_case)
      if (editForm.nutritionFacts.calories !== "") {
        formData.append("nutritionFacts[calories]", editForm.nutritionFacts.calories)
        formData.append("nutrition_facts[calories]", editForm.nutritionFacts.calories)
      }
      if (editForm.nutritionFacts.fat !== "") {
        formData.append("nutritionFacts[fat]", editForm.nutritionFacts.fat)
        formData.append("nutrition_facts[fat]", editForm.nutritionFacts.fat)
      }
      if (editForm.nutritionFacts.protein !== "") {
        formData.append("nutritionFacts[protein]", editForm.nutritionFacts.protein)
        formData.append("nutrition_facts[protein]", editForm.nutritionFacts.protein)
      }

      // Ingredients main (snake_case + optional image)
      editForm.ingredientsMain.forEach((ing, i) => {
        if (ing.name !== "") formData.append(`ingredients_main[${i}][name]`, ing.name)
        if (ing.emoji !== "") formData.append(`ingredients_main[${i}][emoji]`, ing.emoji)
        if (ing.amount !== "") formData.append(`ingredients_main[${i}][amount]`, ing.amount)
        if (ing.imageFile) formData.append(`ingredients_main[${i}][image]`, ing.imageFile)
      })

      // Ingredients extra (snake_case + optional image)
      editForm.ingredientsExtra.forEach((ing, i) => {
        if (ing.name !== "") formData.append(`ingredients_extra[${i}][name]`, ing.name)
        if (ing.emoji !== "") formData.append(`ingredients_extra[${i}][emoji]`, ing.emoji)
        if (ing.amount !== "") formData.append(`ingredients_extra[${i}][amount]`, ing.amount)
        if (ing.imageFile) formData.append(`ingredients_extra[${i}][image]`, ing.imageFile)
      })

      // Ingredients not included (snake_case)
      editForm.ingredientsNotIncluded.forEach((val, i) => {
        if (val !== "") formData.append(`ingredients_not_included[${i}]`, val)
      })

      // Utensils
      editForm.utensils.forEach((val, i) => {
        if (val !== "") formData.append(`utensils[${i}]`, val)
      })

      // Dessert suggestions (no image editing upload here unless new one chosen)
      editForm.dessertSuggestions.forEach((d, i) => {
        if (d.name !== "") formData.append(`dessertSuggestions[${i}][name]`, d.name)
        if (d.price !== "") formData.append(`dessertSuggestions[${i}][price]`, d.price)
        if (d.imageFile) formData.append(`dessertSuggestions[${i}][image]`, d.imageFile)
      })

      // Serving options
      editForm.servingOptions.forEach((s, i) => {
        if (s.servings !== "") formData.append(`servingOptions[${i}][servings]`, s.servings)
        if (s.label !== "") formData.append(`servingOptions[${i}][label]`, s.label)
        if (s.price !== "") formData.append(`servingOptions[${i}][price]`, s.price)
      })

      // If user removed any existing images, include hints for backend to remove them
      if (removedExistingImages.length > 0) {
        // sent below as formData arrays
      }

      // Use method override multipart to PATCH
      const token = localStorage.getItem("auth_token")
      if (token) apiService.setAuthToken(token)
      const response = await apiService.postMultipart(`/products/${editForm.id}`, formData)
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

  // Toggle product active/inactive status using edit endpoint
  const toggleProductStatus = async (product: Product) => {
    try {
      const token = localStorage.getItem("auth_token")
      if (token) apiService.setAuthToken(token)
      const nextActive = product.status !== "active"
      // Build minimal payload with aliases for broad backend compatibility
      const payload: any = {
        is_active: nextActive ? 1 : 0,
        isProductActive: nextActive ? 1 : 0,
        status: nextActive ? "active" : "inactive",
      }
      await apiService.patchJson(`/products/${product.id}`, payload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, status: nextActive ? "active" : "inactive" }
            : p,
        ),
      )
      toast({
        title: "Status Updated",
        description: `Product ${nextActive ? "activated" : "deactivated"}.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update status.",
        variant: "destructive",
      })
    }
  }

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
                  <Label htmlFor="discount_price">Discount Price</Label>
                  <Input
                    id="discount_price"
                    name="discount_price"
                    type="number"
                    min="0"
                    value={addForm.discount_price}
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
              {/* Nutrition Facts */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Calories</Label>
                  <Input
                    value={addForm.nutritionFacts.calories}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        nutritionFacts: { ...p.nutritionFacts, calories: e.target.value },
                      }))
                    }
                    placeholder="e.g., 100"
                  />
                </div>
                <div>
                  <Label>Fat</Label>
                  <Input
                    value={addForm.nutritionFacts.fat}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        nutritionFacts: { ...p.nutritionFacts, fat: e.target.value },
                      }))
                    }
                    placeholder="g"
                  />
                </div>
                <div>
                  <Label>Protein</Label>
                  <Input
                    value={addForm.nutritionFacts.protein}
                    onChange={(e) =>
                      setAddForm((p) => ({
                        ...p,
                        nutritionFacts: { ...p.nutritionFacts, protein: e.target.value },
                      }))
                    }
                    placeholder="g"
                  />
                </div>
              </div>

              {/* Ingredients (Main) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients (Main)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setAddForm((p) => ({
                        ...p,
                        ingredientsMain: [...p.ingredientsMain, { name: "", emoji: "", amount: "", imageFile: null }],
                      }))
                    }
                  >
                    Add Row
                  </Button>
                </div>
                {addForm.ingredientsMain.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.ingredientsMain.slice()
                          next[idx] = { ...next[idx], name: e.target.value }
                          return { ...p, ingredientsMain: next }
                        })
                      }
                    />
                    <Input
                      placeholder="Emoji"
                      value={row.emoji}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.ingredientsMain.slice()
                          next[idx] = { ...next[idx], emoji: e.target.value }
                          return { ...p, ingredientsMain: next }
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) =>
                          setAddForm((p) => {
                            const next = p.ingredientsMain.slice()
                            next[idx] = { ...next[idx], amount: e.target.value }
                            return { ...p, ingredientsMain: next }
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setAddForm((p) => ({
                            ...p,
                            ingredientsMain: p.ingredientsMain.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = (e.target.files && e.target.files[0]) || null
                        setAddForm((p) => {
                          const next = p.ingredientsMain.slice()
                          next[idx] = { ...next[idx], imageFile: file }
                          return { ...p, ingredientsMain: next }
                        })
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Ingredients (Extra) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients (Extra)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setAddForm((p) => ({
                        ...p,
                        ingredientsExtra: [...p.ingredientsExtra, { name: "", emoji: "", amount: "", imageFile: null }],
                      }))
                    }
                  >
                    Add Row
                  </Button>
                </div>
                {addForm.ingredientsExtra.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.ingredientsExtra.slice()
                          next[idx] = { ...next[idx], name: e.target.value }
                          return { ...p, ingredientsExtra: next }
                        })
                      }
                    />
                    <Input
                      placeholder="Emoji"
                      value={row.emoji}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.ingredientsExtra.slice()
                          next[idx] = { ...next[idx], emoji: e.target.value }
                          return { ...p, ingredientsExtra: next }
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) =>
                          setAddForm((p) => {
                            const next = p.ingredientsExtra.slice()
                            next[idx] = { ...next[idx], amount: e.target.value }
                            return { ...p, ingredientsExtra: next }
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setAddForm((p) => ({
                            ...p,
                            ingredientsExtra: p.ingredientsExtra.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = (e.target.files && e.target.files[0]) || null
                        setAddForm((p) => {
                          const next = p.ingredientsExtra.slice()
                          next[idx] = { ...next[idx], imageFile: file }
                          return { ...p, ingredientsExtra: next }
                        })
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Ingredients Not Included */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients Not Included</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddForm((p) => ({ ...p, ingredientsNotIncluded: [...p.ingredientsNotIncluded, ""] }))}
                  >
                    Add Item
                  </Button>
                </div>
                {addForm.ingredientsNotIncluded.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Item"
                      value={val}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.ingredientsNotIncluded.slice()
                          next[idx] = e.target.value
                          return { ...p, ingredientsNotIncluded: next }
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setAddForm((p) => ({
                          ...p,
                          ingredientsNotIncluded: p.ingredientsNotIncluded.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Utensils */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Utensils</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddForm((p) => ({ ...p, utensils: [...p.utensils, ""] }))}
                  >
                    Add Utensil
                  </Button>
                </div>
                {addForm.utensils.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder="Utensil"
                      value={val}
                      onChange={(e) =>
                        setAddForm((p) => {
                          const next = p.utensils.slice()
                          next[idx] = e.target.value
                          return { ...p, utensils: next }
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setAddForm((p) => ({ ...p, utensils: p.utensils.filter((_, i) => i !== idx) }))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Dessert Suggestions (temporarily hidden) */}
              {false && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dessert Suggestions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setAddForm((p) => ({
                          ...p,
                          dessertSuggestions: [...p.dessertSuggestions, { name: "", price: "", imageFile: null }],
                        }))
                      }
                    >
                      Add Dessert
                    </Button>
                  </div>
                  {/* Hidden dessert suggestion fields */}
                </div>
              )}

              {/* Serving Options (temporarily hidden) */}
              {false && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Serving Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setAddForm((p) => ({
                          ...p,
                          servingOptions: [...p.servingOptions, { servings: "", label: "", price: "" }],
                        }))
                      }
                    >
                      Add Option
                    </Button>
                  </div>
                  {/* Hidden serving option fields */}
                </div>
              )}
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
              <DialogDescription>Full product information.</DialogDescription>
            </DialogHeader>
            {viewProduct ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="font-medium">
                      {(() => {
                        const byId = categoryMap[Number(viewProduct.productCategoryId)]
                        if (byId) return byId
                        if (Array.isArray(viewProduct.productCategories) && viewProduct.productCategories.length > 0) {
                          const first = viewProduct.productCategories[0]
                          return first?.name ?? first?.slug ?? viewProduct.productCategoryId ?? "-"
                        }
                        return viewProduct.productCategoryId ?? "-"
                      })()}
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
                    <div className="text-xs text-muted-foreground">Available Quantity</div>
                    <div className="font-medium">{viewProduct.productAvailableQuantity ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Original Price</div>
                    <div className="font-medium">{viewProduct.productOriginalPrice ?? viewProduct.originalPrice ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Discount Price</div>
                    <div className="font-medium">{viewProduct.productdiscount_price ?? viewProduct.discount_price ?? "-"}</div>
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
                {/* Nutrition Facts */}
                <div>
                  <div className="text-xs text-muted-foreground">Nutrition Facts</div>
                  <div className="mt-1 text-sm">
                    {(() => {
                      const n = viewProduct.nutritionFacts || {}
                      const parts: string[] = []
                      if (n.calories != null && n.calories !== "") parts.push(`Calories: ${n.calories}`)
                      if (n.fat != null && n.fat !== "") parts.push(`Fat: ${n.fat}`)
                      if (n.protein != null && n.protein !== "") parts.push(`Protein: ${n.protein}`)
                      return parts.length ? parts.join(" • ") : "-"
                    })()}
                  </div>
                </div>

                {/* Ingredients */}
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Main Ingredients Card */}
                  <Card className="border shadow-sm">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Ingredients (Main)</CardTitle>
                      <CardDescription className="text-xs">Primary required ingredients.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {Array.isArray(viewProduct.ingredientsMain) && viewProduct.ingredientsMain.length > 0 ? (
                        <ul className="space-y-2">
                          {viewProduct.ingredientsMain.map((r: any, i: number) => (
                            <li key={i} className="flex items-start gap-2 rounded border p-2 text-sm bg-muted/30">
                              {/* Emoji */}
                              <div className="w-6 h-6 flex items-center justify-center text-base">
                                {r?.emoji ? r.emoji : <span className="text-muted-foreground">•</span>}
                              </div>
                              <div className="flex-1 leading-tight">
                                <div className="font-medium flex items-center gap-1">
                                  {r?.name ? r.name : <span className="text-muted-foreground">Unnamed</span>}
                                </div>
                                {(r?.amount) && (
                                  <div className="text-xs text-muted-foreground mt-0.5">{r.amount}</div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-muted-foreground">No main ingredients</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Extra Ingredients Card */}
                  <Card className="border shadow-sm">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Ingredients (Extra)</CardTitle>
                      <CardDescription className="text-xs">Optional or additional ingredients.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {Array.isArray(viewProduct.ingredientsExtra) && viewProduct.ingredientsExtra.length > 0 ? (
                        <ul className="space-y-2">
                          {viewProduct.ingredientsExtra.map((r: any, i: number) => (
                            <li key={i} className="flex items-start gap-2 rounded border p-2 text-sm bg-muted/30">
                              <div className="w-6 h-6 flex items-center justify-center text-base">
                                {r?.emoji ? r.emoji : <span className="text-muted-foreground">•</span>}
                              </div>
                              <div className="flex-1 leading-tight">
                                <div className="font-medium flex items-center gap-1">
                                  {r?.name ? r.name : <span className="text-muted-foreground">Unnamed</span>}
                                </div>
                                {(r?.amount) && (
                                  <div className="text-xs text-muted-foreground mt-0.5">{r.amount}</div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-muted-foreground">No extra ingredients</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Not Included & Utensils */}
                <div className="grid gap-3 md:grid-cols-2">
                  <Card className="border shadow-sm">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Ingredients Not Included</CardTitle>
                      <CardDescription className="text-xs">Items you'll need separately.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {Array.isArray(viewProduct.ingredientsNotIncluded) && viewProduct.ingredientsNotIncluded.length > 0 ? (
                        <ul className="flex flex-wrap gap-1">
                          {viewProduct.ingredientsNotIncluded.map((val: string, i: number) => (
                            <li key={i} className="text-[11px] px-2 py-1 rounded bg-muted/50 border">
                              {val}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-muted-foreground">None listed</div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border shadow-sm">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Utensils</CardTitle>
                      <CardDescription className="text-xs">Tools required for preparation.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {Array.isArray(viewProduct.utensils) && viewProduct.utensils.length > 0 ? (
                        <ul className="flex flex-wrap gap-1">
                          {viewProduct.utensils.map((val: string, i: number) => (
                            <li key={i} className="text-[11px] px-2 py-1 rounded bg-muted/50 border">
                              {val}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-muted-foreground">None listed</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Dessert Suggestions (hidden) */}
                {false && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Dessert Suggestions</div>
                  </div>
                )}

                {/* Serving Options (hidden) */}
                {false && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Serving Options</div>
                  </div>
                )}
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
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  const n = Number(val)
                  const allowed = [15, 25, 50, 100]
                  if (!allowed.includes(n)) return
                  setPerPage(n)
                  // Reset to page 1 any time page size changes
                  setCurrentPage(1)
                  fetchProducts(1, n)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 (default)</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
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
                  <Label htmlFor="edit_discount_price">Discount Price</Label>
                  <Input
                    id="edit_discount_price"
                    name="discount_price"
                    type="number"
                    min="0"
                    value={editForm.discount_price}
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
              {/* Nutrition Facts (Edit) */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Calories</Label>
                  <Input
                    value={editForm.nutritionFacts.calories}
                    onChange={(e) => setEditForm((p) => ({ ...p, nutritionFacts: { ...p.nutritionFacts, calories: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label>Fat</Label>
                  <Input
                    value={editForm.nutritionFacts.fat}
                    onChange={(e) => setEditForm((p) => ({ ...p, nutritionFacts: { ...p.nutritionFacts, fat: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label>Protein</Label>
                  <Input
                    value={editForm.nutritionFacts.protein}
                    onChange={(e) => setEditForm((p) => ({ ...p, nutritionFacts: { ...p.nutritionFacts, protein: e.target.value } }))}
                  />
                </div>
              </div>

              {/* Ingredients (Main) Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients (Main)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditForm((p) => ({ ...p, ingredientsMain: [...p.ingredientsMain, { name: "", emoji: "", amount: "", imageFile: null }] }))}
                  >
                    Add Row
                  </Button>
                </div>
                {editForm.ingredientsMain.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) => setEditForm((p) => { const next = p.ingredientsMain.slice(); next[idx] = { ...next[idx], name: e.target.value }; return { ...p, ingredientsMain: next } })}
                    />
                    <Input
                      placeholder="Emoji"
                      value={row.emoji}
                      onChange={(e) => setEditForm((p) => { const next = p.ingredientsMain.slice(); next[idx] = { ...next[idx], emoji: e.target.value }; return { ...p, ingredientsMain: next } })}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount"
                        value={row.amount}
                        onChange={(e) => setEditForm((p) => { const next = p.ingredientsMain.slice(); next[idx] = { ...next[idx], amount: e.target.value }; return { ...p, ingredientsMain: next } })}
                      />
                      <Button type="button" variant="ghost" onClick={() => setEditForm((p) => ({ ...p, ingredientsMain: p.ingredientsMain.filter((_, i) => i !== idx) }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = (e.target.files && e.target.files[0]) || null
                        setEditForm((p) => { const next = p.ingredientsMain.slice(); next[idx] = { ...next[idx], imageFile: file }; return { ...p, ingredientsMain: next } })
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Ingredients (Extra) Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients (Extra)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditForm((p) => ({ ...p, ingredientsExtra: [...p.ingredientsExtra, { name: "", emoji: "", amount: "", imageFile: null }] }))}
                  >
                    Add Row
                  </Button>
                </div>
                {editForm.ingredientsExtra.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input placeholder="Name" value={row.name} onChange={(e) => setEditForm((p) => { const next = p.ingredientsExtra.slice(); next[idx] = { ...next[idx], name: e.target.value }; return { ...p, ingredientsExtra: next } })} />
                    <Input placeholder="Emoji" value={row.emoji} onChange={(e) => setEditForm((p) => { const next = p.ingredientsExtra.slice(); next[idx] = { ...next[idx], emoji: e.target.value }; return { ...p, ingredientsExtra: next } })} />
                    <div className="flex gap-2">
                      <Input placeholder="Amount" value={row.amount} onChange={(e) => setEditForm((p) => { const next = p.ingredientsExtra.slice(); next[idx] = { ...next[idx], amount: e.target.value }; return { ...p, ingredientsExtra: next } })} />
                      <Button type="button" variant="ghost" onClick={() => setEditForm((p) => ({ ...p, ingredientsExtra: p.ingredientsExtra.filter((_, i) => i !== idx) }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => { const file = (e.target.files && e.target.files[0]) || null; setEditForm((p) => { const next = p.ingredientsExtra.slice(); next[idx] = { ...next[idx], imageFile: file }; return { ...p, ingredientsExtra: next } }) }} />
                  </div>
                ))}
              </div>

              {/* Ingredients Not Included Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredients Not Included</Label>
                  <Button type="button" variant="outline" onClick={() => setEditForm((p) => ({ ...p, ingredientsNotIncluded: [...p.ingredientsNotIncluded, ""] }))}>Add Item</Button>
                </div>
                {editForm.ingredientsNotIncluded.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input placeholder="Item" value={val} onChange={(e) => setEditForm((p) => { const next = p.ingredientsNotIncluded.slice(); next[idx] = e.target.value; return { ...p, ingredientsNotIncluded: next } })} />
                    <Button type="button" variant="ghost" onClick={() => setEditForm((p) => ({ ...p, ingredientsNotIncluded: p.ingredientsNotIncluded.filter((_, i) => i !== idx) }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Utensils Edit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Utensils</Label>
                  <Button type="button" variant="outline" onClick={() => setEditForm((p) => ({ ...p, utensils: [...p.utensils, ""] }))}>Add Utensil</Button>
                </div>
                {editForm.utensils.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input placeholder="Utensil" value={val} onChange={(e) => setEditForm((p) => { const next = p.utensils.slice(); next[idx] = e.target.value; return { ...p, utensils: next } })} />
                    <Button type="button" variant="ghost" onClick={() => setEditForm((p) => ({ ...p, utensils: p.utensils.filter((_, i) => i !== idx) }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Dessert Suggestions Edit (hidden) */}
              {false && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dessert Suggestions</Label>
                  </div>
                </div>
              )}

              {/* Serving Options Edit (hidden) */}
              {false && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Serving Options</Label>
                  </div>
                </div>
              )}
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
              <Select
                value={String(perPage)}
                onValueChange={(val) => {
                  const n = Number(val)
                  const allowed = [15, 25, 50, 100]
                  if (!allowed.includes(n)) return
                  setPerPage(n)
                  setCurrentPage(1)
                  fetchProducts(1, n)
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 (default)</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
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
                        {categoryMap[Number(product.categoryId ?? -1)] || product.productCategories?.name || "-"}
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
                        {(() => {
                          // Accept multiple possible backend field names
                          const rawDiscount = (product as any).discount_price ?? (product as any).discountPrice
                          const discountNum = rawDiscount === "" || rawDiscount == null ? NaN : Number(rawDiscount)
                          const hasDiscount = Number.isFinite(discountNum) && discountNum > 0

                          const rawOriginal = (product as any).original_price ?? (product as any).originalPrice ?? (product as any).productOriginalPrice ?? product.price
                          const originalNum = rawOriginal === "" || rawOriginal == null ? NaN : Number(rawOriginal)

                          const value = hasDiscount ? discountNum : originalNum
                          if (!Number.isFinite(value)) return "N/A"
                          const currency = (product as any).currency
                          return (product as any).priceFormatted || (currency ? `${currency} ${value.toFixed(2)}` : `$${value.toFixed(2)}`)
                        })()}
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
                            <DropdownMenuItem onClick={() => toggleProductStatus(product)}>
                              <Trash2 className="mr-2 h-4 w-4 rotate-90" />
                              {product.status === "active" ? "Deactivate" : "Activate"}
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

