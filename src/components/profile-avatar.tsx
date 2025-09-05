"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Edit, Eye, EyeOff } from "lucide-react"

export function ProfileAvatar() {
  const { user, logout, updateUser } = useAuth() || {}
  const { toast } = useToast()
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  phone: (user as any)?.phone || "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    // Update profileData state when user context changes
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
  phone: (user as any)?.phone || "",
      }))
    }
  }, [user])

  if (!user) return null

  const getInitials = (name: string) => {
    if (!name) return "NA"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleProfileUpdate = async () => {
    try {
  //
      // Validate passwords if changing
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmPassword) {
          toast({
            title: "Error",
            description: "New passwords don't match.",
            variant: "destructive",
          })
          return
        }
        if (profileData.newPassword.length < 8) {
          toast({
            title: "Error",
            description: "Password must be at least 8 characters long.",
            variant: "destructive",
          })
          return
        }
      }
      // Build payload
      const [firstNameRaw, ...rest] = (profileData.name || "").trim().split(/\s+/)
      const first_name = firstNameRaw || profileData.name
      const last_name = rest.join(" ") || ""
      const payload: Record<string, any> = {
        first_name,
        last_name,
        email: profileData.email,
        phone: profileData.phone,
      }
      if (profileData.newPassword) {
        payload.password = profileData.newPassword
        payload.password_confirmation = profileData.confirmPassword
      }

      // Ensure auth token is set
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (!token) {
        toast({ title: "Auth error", description: "Missing auth token.", variant: "destructive" })
        return
      }

      // Lazy import to avoid circular
      const { apiService } = await import("@/lib/api-service")
      apiService.setAuthToken(token)

      // Some Laravel routes accept PATCH on /admins (not /admins/profile) and prefer form encoding
      const formPayload: Record<string, string> = {
        first_name: String(payload.first_name ?? ""),
        last_name: String(payload.last_name ?? ""),
        email: String(payload.email ?? ""),
        phone: String(payload.phone ?? ""),
      }
      if (payload.password) {
        formPayload.password = String(payload.password)
        formPayload.password_confirmation = String(payload.password_confirmation ?? "")
      }
      await apiService.patchFormData("/admins", formPayload)

      // Update local user data
      const updatedUser = {
        ...user,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
      }
      updateUser?.(updatedUser)

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })

      setIsEditing(false)
      setProfileData({
        ...profileData,
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Profile update error:", error)
      toast({
        title: "Error",
        description: (() => {
          const msg = (error as any)?.message ?? "Failed to update profile."
          try {
            const parsed = JSON.parse(String(msg))
            if (parsed?.message) return String(parsed.message)
            if (parsed?.errors) {
              const firstKey = Object.keys(parsed.errors)[0]
              const firstMsg = parsed.errors[firstKey]?.[0]
              if (firstMsg) return String(firstMsg)
            }
          } catch {}
          return String(msg)
        })(),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setProfileData({
      name: user?.name || "",
      email: user?.email || "",
  phone: (user as any)?.phone || "",
      newPassword: "",
      confirmPassword: "",
    })
    setIsEditing(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {/* <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem> */}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Admin Profile
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update your profile information" : "View and manage your profile"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.role}</p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                />
              </div>

              {isEditing && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="newPassword" className="text-right">
                      New Password
                    </Label>
                    <div className="col-span-3 relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                        className="pr-10"
                        placeholder="Leave empty to keep current"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                        onClick={() => setShowNewPassword((s) => !s)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="confirmPassword" className="text-right">
                      Confirm Password
                    </Label>
                    <div className="col-span-3 relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={profileData.confirmPassword}
                        onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                        className="pr-10"
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Account Info */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account Type:</span>
                <span className="font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID:</span>
                <span className="font-medium">#{user.id}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            {isEditing ? (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleProfileUpdate}>Save Changes</Button>
              </div>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
