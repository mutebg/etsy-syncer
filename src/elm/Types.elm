module Types exposing (..)

import Http


type alias Product =
    { id : Int
    , title : String
    , isActive : Bool
    , etsyPrice : Float
    , amazonId : String
    , profit : Float
    , minPrice : Float
    }


type FormMessage
    = TextInput String String
    | Checkbox String Bool


type Msg
    = NoOp
    | UpdateProductField Int FormMessage
    | LoadProducts (Result Http.Error (List Product))
    | SaveProduct Product
    | ReqSaveProduct (Result Http.Error Product)
