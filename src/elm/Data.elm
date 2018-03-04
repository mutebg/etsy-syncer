module Data exposing (..)

import Json.Decode as Decode
import Json.Decode.Pipeline as DecodePipe
import Json.Encode as Encode
import Http
import Types exposing (..)


apiBase : String
apiBase =
    "https://us-central1-etsy-syncer.cloudfunctions.net/api/"



--"http://localhost:5000/etsy-syncer/us-central1/api/"


productsDecoder : Decode.Decoder (List Product)
productsDecoder =
    Decode.at [ "products" ] (Decode.list productDecoder)


productDecoder : Decode.Decoder Product
productDecoder =
    DecodePipe.decode Product
        |> DecodePipe.required "id" Decode.int
        |> DecodePipe.required "title" Decode.string
        |> DecodePipe.required "isActive" Decode.bool
        |> DecodePipe.required "etsyPrice" Decode.float
        |> DecodePipe.required "amazonId" Decode.string
        |> DecodePipe.required "profit" Decode.float
        |> DecodePipe.required "minPrice" Decode.float


productEncoder : Product -> Encode.Value
productEncoder product =
    let
        attributes =
            [ ( "id", Encode.int product.id )
            , ( "title", Encode.string product.title )
            , ( "isActive", Encode.bool product.isActive )
            , ( "etsyPrice", Encode.float product.etsyPrice )
            , ( "amazonId", Encode.string product.amazonId )
            , ( "profit", Encode.float product.profit )
            , ( "minPrice", Encode.float product.minPrice )
            ]
    in
        Encode.object attributes


loadProducts : Cmd Msg
loadProducts =
    let
        url =
            apiBase ++ "products"

        request =
            Http.get url productsDecoder
    in
        Http.send LoadProducts request


saveProduct : Product -> Cmd Msg
saveProduct product =
    let
        url =
            apiBase ++ "products/" ++ (toString product.id)

        body =
            productEncoder product |> Http.jsonBody

        request =
            Http.post url body productDecoder
    in
        Http.send ReqSaveProduct request
