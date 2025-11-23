"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const COUNTRY_CODES = [
  "+1","+7","+20","+27","+30","+31","+32","+33","+34","+36","+39","+40","+41","+43","+44","+45","+46","+47","+48","+49",
  "+51","+52","+53","+54","+55","+56","+57","+58","+60","+61","+62","+63","+64","+65","+66","+81","+82","+84","+86",
  "+90","+91","+92","+93","+94","+95","+98","+212","+213","+216","+218","+220","+221","+222","+223","+224","+225","+226","+227","+228","+229",
  "+233","+234","+235","+236","+237","+238","+239","+240","+241","+242","+243","+244","+245","+246","+248","+249","+250","+251","+252","+253",
  "+254","+255","+256","+257","+258","+260","+261","+262","+263","+264","+265","+266","+267","+268","+269","+290","+291","+297","+298","+299",
  "+350","+351","+352","+353","+354","+355","+356","+357","+358","+359","+370","+371","+372","+373","+374","+375","+376","+377","+378","+379",
  "+380","+381","+382","+383","+385","+386","+387","+389","+420","+421","+423","+503","+504","+505","+506","+507","+508","+509","+590","+591",
  "+592","+593","+594","+595","+596","+597","+598","+599","+670","+672","+674","+675","+676","+677","+678","+679","+680","+681","+682","+683",
  "+685","+686","+687","+688","+689","+690","+691","+692","+850","+852","+853","+855","+856","+880","+886","+960","+961","+962","+963","+964",
  "+965","+966","+967","+968","+970","+971","+972","+973","+974","+975","+976","+977","+992","+993","+994","+995","+996","+998"
]

export function ProfileAvatar() {
  const { user, logout, updateUser } = useAuth() || {}
  const { toast } = useToast()
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileData, setProfileData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: user?.email || "",
    phone: user?.phone || "",
    country_code: "",
    birth_date: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)

  // Basic email validator that requires a TLD (e.g., example.com)
  const isValidEmail = (email: string) => {
    const re = /^(?=.{1,254}$)(?=.{1,64}@)[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    return re.test(email.trim())
  }

  useEffect(() => {
    // Update profileData state when user context changes
    if (user) {
      // use top-level COUNTRY_CODES

      const fullName = String(user.name || "").trim()
      const parts = fullName ? fullName.split(/\s+/) : []
      const first = parts[0] || ""
      const last = parts.length > 1 ? parts[parts.length - 1] : ""
      const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""
      // Try to split phone into country code + local number
      let initialCountry = COUNTRY_CODES.includes("+966") ? "+966" : COUNTRY_CODES[0]
      let localPhone = String(user.phone || "")
      if (localPhone.startsWith("+")) {
        // find longest matching code
        const sorted = COUNTRY_CODES.slice().sort((a,b) => b.length - a.length)
        let found = ""
        for (const c of sorted) {
          if (localPhone.startsWith(c)) { found = c; break }
        }
        if (found) {
          initialCountry = found
          localPhone = localPhone.slice(found.length)
        } else {
          // remove leading + and keep rest
          localPhone = localPhone.replace(/^\+/, "")
        }
      }
      // strip non-digits from local phone
      localPhone = localPhone.replace(/\D/g, "")

      setProfileData((prev) => ({
        ...prev,
        first_name: first,
        middle_name: middle,
        last_name: last,
        email: user.email,
        phone: localPhone || "",
        country_code: String((user as any)?.country_code || initialCountry),
        birth_date: (user as any)?.birth_date || "",
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
      // Email validation
      if (!isValidEmail(profileData.email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email like user@example.com.",
          variant: "destructive",
        })
        return
      }
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
      // Client-side basic validation matching backend rules
      const firstNameValid = /^[A-Za-z]+$/.test(profileData.first_name.trim())
      if (!firstNameValid) {
        toast({
          title: "Invalid first name",
          description: "First name must contain letters only (A-Z).",
          variant: "destructive",
        })
        return
      }
      const lastNameValid = /^[A-Za-z]+$/.test(profileData.last_name.trim())
      if (!lastNameValid) {
        toast({
          title: "Invalid last name",
          description: "Last name must contain letters only (A-Z).",
          variant: "destructive",
        })
        return
      }
      if (profileData.middle_name.trim() && !/^[A-Za-z]+$/.test(profileData.middle_name.trim())) {
        toast({
          title: "Invalid middle name",
          description: "Middle name must contain letters only (A-Z).",
          variant: "destructive",
        })
        return
      }
      const phoneTrimmed = profileData.phone.trim()
      // local phone part should be digits only (without country code)
      const phoneValid = /^\d{6,14}$/.test(phoneTrimmed)
      if (!phoneValid) {
        toast({
          title: "Invalid phone",
          description: "Phone format must be digits only (without country code), 6-14 digits.",
          variant: "destructive",
        })
        return
      }
      // country code required when phone present
      if (!profileData.country_code || String(profileData.country_code).trim() === "") {
        toast({ title: "Country code required", description: "Please select a country code.", variant: "destructive" })
        return
      }
      // Build payload fields from separate name inputs
      const first_name = profileData.first_name.trim()
      const last_name = profileData.last_name.trim()
      // Prepare multipart form data per updated API contract
      const formData = new FormData()
      formData.append("first_name", String(first_name ?? ""))
      formData.append("last_name", String(last_name ?? ""))
      if (profileData.birth_date) formData.append("birth_date", String(profileData.birth_date))
      formData.append("email", String(profileData.email ?? ""))
      // send phone without leading +; backend expects country_code separately
      formData.append("phone", String(phoneTrimmed))
      formData.append("country_code", String(profileData.country_code || ""))
      if (profileData.newPassword) {
        formData.append("password", String(profileData.newPassword))
        formData.append("password_confirmation", String(profileData.confirmPassword ?? ""))
      }
      if (profileImageFile) {
        formData.append("profile_image", profileImageFile)
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

      // Updated endpoint: POST with method override
      const resp = await apiService.postMultipart("/admins?_method=patch", formData)

      // Extract avatar URL from response if present
      const updatedAvatarUrl: string | undefined = Array.isArray(resp?.data?.adminProfileImage) && resp.data.adminProfileImage.length > 0
        ? String(resp.data.adminProfileImage[0].url)
        : undefined

      // Update local user data
      const updatedUser = {
        ...user,
        name: [profileData.first_name, profileData.middle_name, profileData.last_name].filter(Boolean).join(" "),
        email: profileData.email,
        phone: `${profileData.country_code || ""}${profileData.phone}`,
        avatarUrl: updatedAvatarUrl ?? user.avatarUrl,
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
      setProfileImageFile(null)
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
    const fullName = String(user?.name || "").trim()
    const parts = fullName ? fullName.split(/\s+/) : []
    const first = parts[0] || ""
    const last = parts.length > 1 ? parts[parts.length - 1] : ""
    const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : ""
    setProfileData({
      first_name: first,
      middle_name: middle,
      last_name: last,
      email: user?.email || "",
      phone: user?.phone || "",
      birth_date: (user as any)?.birth_date || "",
      newPassword: "",
      confirmPassword: "",
    })
    setIsEditing(false)
    setProfileImageFile(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
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
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : null}
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
                <Label htmlFor="first_name" className="text-right">
                  First Name
                </Label>
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                  pattern="[A-Za-z]+"
                  title="First name must contain letters only"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="middle_name" className="text-right">
                  Middle Name (optional)
                </Label>
                <Input
                  id="middle_name"
                  value={profileData.middle_name}
                  onChange={(e) => setProfileData({ ...profileData, middle_name: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                  pattern="[A-Za-z]+"
                  title="Middle name must contain letters only"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="last_name" className="text-right">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                  pattern="[A-Za-z]+"
                  title="Last name must contain letters only"
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
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                  title="Enter a valid email address (must include a domain like .com)"
                  className="col-span-3"
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <div className="col-span-3 flex items-center">
                  <select
                    id="country_code"
                    value={profileData.country_code}
                    onChange={(e) => setProfileData({ ...profileData, country_code: e.target.value })}
                    disabled={!isEditing}
                    className="w-28 mr-2 rounded border px-2 py-1 bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
                  >
                    <option value="" disabled>Select</option>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value.replace(/\D/g, "") })}
                    className="flex-1"
                    disabled={!isEditing}
                    pattern="^\d{6,14}$"
                    title="Enter local phone digits (without country code), 6-14 digits"
                    placeholder="e.g. 501234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="birth_date" className="text-right">
                  Birth Date
                </Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={profileData.birth_date}
                  onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                  className="col-span-3"
                  disabled={!isEditing}
                />
              </div>

              {isEditing && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="profile_image" className="text-right">
                    Profile Image
                  </Label>
                  <Input
                    id="profile_image"
                    type="file"
                    accept="image/*"
                    className="col-span-3"
                    onChange={(e) => setProfileImageFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

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
