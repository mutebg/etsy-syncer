module Views exposing (..)

import Html exposing (..)
import Html.Attributes exposing (..)
import Html.Events exposing (onClick, onInput, onCheck)
import Types exposing (..)


productList : List Product -> Html Msg
productList products =
    table [ class "table table-striped table-bordered table-hover" ]
        [ thead []
            [ tr []
                [ th [] []
                , th [] [ text "id" ]
                , th [] [ text "name" ]
                , th [] [ text "Etsy price" ]
                , th [] [ text "Profit" ]
                , th [] [ text "Min price" ]
                , th [] [ text "Amazon ID" ]
                , th [] []
                ]
            ]
        , tbody []
            (List.map
                productRow
                products
            )
        ]


productRow : Product -> Html Msg
productRow product =
    let
        updateField =
            UpdateProductField product.id

        onActiveCheck =
            (\val -> updateField (Checkbox "isActive" val))

        -- onEtsyPriceChange =
        --     (\val -> updateField (TextInput "etsyPrice" val))
        onMinPriceChange =
            (\val -> updateField (TextInput "minPrice" val))

        onProfitChange =
            (\val -> updateField (TextInput "profit" val))

        onAmazonIdChange =
            (\val -> updateField (TextInput "amazonId" val))

        onClickUpdate =
            SaveProduct product
    in
        tr []
            [ td [] [ input [ type_ "checkbox", checked product.isActive, onCheck onActiveCheck ] [] ]
            , td [] [ text <| toString product.id ]
            , td [] [ text product.title ]
              --, td [] [ input [ type_ "text", value <| toString product.etsyPrice, onInput onEtsyPriceChange ] [] ]
            , td [] [ text <| toString product.etsyPrice ]
            , td [] [ input [ type_ "text", value <| toString product.profit, onInput onProfitChange ] [] ]
            , td [] [ input [ type_ "text", value <| toString product.minPrice, onInput onMinPriceChange ] [] ]
            , td [] [ input [ type_ "text", value product.amazonId, onInput onAmazonIdChange ] [] ]
            , td [] [ button [ class "btn btn-primary", onClick onClickUpdate ] [ text "Save" ] ]
            ]
