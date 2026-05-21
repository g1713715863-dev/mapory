export interface Trip {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  start_date: string | null
  end_date: string | null
  is_public: boolean
  created_at: string
  photo_count?: number
}

export interface ShareLink {
  id: string
  token: string
  trip_ids: string[]
  label: string
  created_at: string
}

export interface Photo {
  id: string
  trip_id: string
  storage_key: string
  url: string
  thumbnail_url: string | null
  title: string | null
  body: string | null
  lat: number | null
  lng: number | null
  location_name: string | null
  taken_at: string | null
  created_at: string
  trip?: Trip
}

export interface Comment {
  id: string
  photo_id: string
  user_id: string
  body: string
  created_at: string
  user?: { email: string; display_name: string | null }
}

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
}
