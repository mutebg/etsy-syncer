module Main exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick)
import Types exposing (..)
import Views exposing (..)
import Data exposing (..)


-- APP


main : Program Never Model Msg
main =
    Html.program { init = init, view = view, update = update, subscriptions = subscriptions }


type alias Model =
    { products : List Product
    }


model : Model
model =
    { products = []
    }


init : ( Model, Cmd Msg )
init =
    ( model, Cmd.batch [ loadProducts ] )



-- SUBSCRIBTION


subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none



-- UPDATE


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        LoadProducts (Ok products) ->
            ( { model | products = products }, Cmd.none )

        SaveProduct product ->
            ( model, saveProduct product )

        UpdateProductField id message ->
            let
                newProducts =
                    updateProducts model.products id message
            in
                ( { model | products = newProducts }, Cmd.none )

        _ ->
            ( model, Cmd.none )



-- VIEW
-- Html is defined as: elem [ attribs ][ children ]
-- CSS can be applied via class names or inline style attrib


view : Model -> Html Msg
view model =
    div [ class "container" ]
        [ productList model.products
        ]


updateProducts : List Product -> Int -> FormMessage -> List Product
updateProducts products id message =
    List.map
        (\p ->
            if p.id == id then
                updateProduct p message
            else
                p
        )
        products


updateProduct : Product -> FormMessage -> Product
updateProduct product message =
    case message of
        TextInput "etsyPrice" inputValue ->
            { product | etsyPrice = Result.withDefault 0 (String.toFloat inputValue) }

        TextInput "profit" inputValue ->
            { product | profit = Result.withDefault 0 (String.toFloat inputValue) }

        TextInput "amazonId" inputValue ->
            { product | amazonId = inputValue }

        Checkbox "isActive" inputValue ->
            { product | isActive = inputValue }

        _ ->
            product
