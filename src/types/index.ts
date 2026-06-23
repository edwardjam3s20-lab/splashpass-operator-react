export interface Operator {
  id: string
  name: string
  email: string
  wash_point: string
  wash_point_id: string | null
  status: 'open' | 'paused'
  commission_tier: number
}

export interface Service {
  id: string
  wash_point_id: string
  name: string
  description: string | null
  price: number
  duration: number | null
  icon: string | null
  price_saloon?: number | null
  price_suv?: number | null
  price_pickup?: number | null
  price_van?: number | null
  price_hatchback?: number | null
  price_coupe?: number | null
  points_value?: number | null
}

export interface Booking {
  id: string
  user_name: string
  user_email: string
  date: string
  time: string
  status: 'confirmed' | 'completed' | 'cancelled'
  car_plate: string
  car_type: string
  car_make: string
  car_model: string
  service_name: string
  wash_price: number
  total_amount: number
  operator_amount: number
  splash_commission: number
  commission_tier: number
  payment_status?: 'pending' | 'paid'
  // Confirmed from bookings/[id]/route.js's PATCH action handlers
  assigned_washer_id?: string | null
  assigned_by_operator_id?: string | null
  assigned_at?: string | null
  wash_started_at?: string | null
  wash_completed_at?: string | null
  points_earned?: number | null
}

export interface Washer {
  id: string
  wash_point_id: string
  name: string
  role?: string
  created_at?: string
}
