export interface LocalProduct {
  id: number,
  title: string,
  isActive: boolean,
  etsyPrice: number,
  amazonId: string,
  profit: number
}

export interface EtsyProduct {
  listing_id: number,
  price: number,
  title: string
}

export interface EtsyProductResponse {
  results: EtsyProduct[]
}


export interface AmazonProduct {
  price:number,
  currency: string,
  isPrime: boolean
}
