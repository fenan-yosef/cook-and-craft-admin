  import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react"
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

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  status: "active" | "inactive"
  created_at: string
  images?: string[] // Add images field (array of URLs)
}

export default function SubscriptionIntervalsPage() {
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
  })
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const editFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await apiService.get("/admins/products")
      const mappedProducts: Product[] = (response.data || []).map((item: any) => ({
        id: item.productId,
        name: item.productName,
        description: item.productSku,
        price: item.productPrice,
        stock: item.productAvailableQuantity,
        status: item.isProductActive ? "active" : "inactive",
        created_at: item.createdAt || new Date().toISOString(),
        // Use the correct property for image URL (adjust as per your API, e.g. imageUrl, url, or path)
        images: item.productImages?.map((img: any) => img.imageUrl || img.url || img.path || img) || [],
      }))
      setProducts(mappedProducts)
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
    } finally {
      setLoading(false)
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
      formData.append("description", addForm.description)
      formData.append("price", addForm.price)
      formData.append("quantity", addForm.quantity)
      formData.append("is_active", addForm.is_active ? "1" : "0")
      formData.append("is_private", addForm.is_private ? "1" : "0")
      addForm.images.forEach((file) => formData.append("images[]", file))

      // Use fetch directly for multipart/form-data
      const res = await fetch("https://cook-craft.dhcb.io/api/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to add product")
      }

      toast({
        title: "Success",
        description: "Product added successfully.",
      })
      setIsAddOpen(false)
      resetAddForm()
      fetchProducts()
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
        description: editForm.description,
        price: Number(editForm.price),
        quantity: Number(editForm.quantity),
        is_active: editForm.is_active ? 1 : 0,
        is_private: editForm.is_private ? 1 : 0,
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
      fetchProducts()
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
                <Label htmlFor="name">Name</Label>
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

        {/* Edit Product Modal */}
        <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetEditForm() }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update the product details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditProduct} className="space-y-4">
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
                  <TableHead>Image</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
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
                      <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

