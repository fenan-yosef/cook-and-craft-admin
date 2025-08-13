class ApiService {
  private baseURL: string
  private authToken: string | null = null

  constructor() {
    this.baseURL = "https://cook-craft.dhcb.io/api"
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`
    }

    return headers
  }

  // Add a method for form-encoded requests (like login)
  async postFormData(endpoint: string, data: Record<string, string>) {
    console.log(`Making form request to: ${this.baseURL}${endpoint}`)

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      },
      body: new URLSearchParams(data),
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} - ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // PATCH with application/x-www-form-urlencoded body
  async patchFormData(endpoint: string, data: Record<string, string>) {
    console.log(`Making form PATCH request to: ${this.baseURL}${endpoint}`)

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      },
      body: new URLSearchParams(data),
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} - ${errorText}`)
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async get(endpoint: string) {
    console.log(`Making GET request to: ${this.baseURL}${endpoint}`)

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} - ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async post(endpoint: string, data: any) {
    console.log(`Making POST request to: ${this.baseURL}${endpoint}`)

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} - ${errorText}`)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async postMultipart(endpoint: string, formData: FormData) {
    console.log(`Making multipart POST request to: ${this.baseURL}${endpoint}`)
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      },
      body: formData,
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error: ${response.status} - ${errorText}`)
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async patch(endpoint: string, data?: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async patchJson(endpoint: string, data: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: this.authToken ? `Bearer ${this.authToken}` : "",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`PATCH API Error: ${response.status} - ${errorText}`)
      throw new Error(errorText || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async put(endpoint: string, data?: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async delete(endpoint: string) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }
}

export const apiService = new ApiService()
