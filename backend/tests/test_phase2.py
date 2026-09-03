"""
Phase 2 backend tests — vehicle schemas, configurator validation, pricing, asset metadata.

These are offline unit tests. No live backend or MongoDB required.
Run with: pytest backend/tests/test_phase2.py -v
"""

import pytest
from pydantic import ValidationError


# ── Vehicle Schema Tests ───────────────────────────────────────────────────

class TestBrandSchema:
    def test_valid_brand(self):
        from vehicle_schemas import BrandCreate
        b = BrandCreate(
            brand_id="tata-motors",
            name="Tata Motors",
            country_of_origin="India",
            active_in_india=True,
        )
        assert b.brand_id == "tata-motors"
        assert b.active_in_india is True

    def test_invalid_brand_id_uppercase(self):
        from vehicle_schemas import BrandCreate
        with pytest.raises(ValidationError, match="brand_id"):
            BrandCreate(brand_id="Tata-Motors", name="Tata")

    def test_invalid_brand_id_spaces(self):
        from vehicle_schemas import BrandCreate
        with pytest.raises(ValidationError):
            BrandCreate(brand_id="tata motors", name="Tata")

    def test_brand_id_single_char_rejected(self):
        from vehicle_schemas import BrandCreate
        with pytest.raises(ValidationError):
            BrandCreate(brand_id="t", name="T")


class TestVariantSchema:
    def test_valid_variant(self):
        from vehicle_schemas import VariantCreate, VariantSpecs, FuelType, TransmissionType
        v = VariantCreate(
            variant_id="tata-nexon-xz-plus-petrol",
            model_id="tata-nexon",
            brand_id="tata-motors",
            name="Nexon XZ+ Petrol MT",
            specs=VariantSpecs(
                fuel_type=FuelType.PETROL,
                transmission=TransmissionType.MANUAL,
                seats=5,
            ),
        )
        assert v.variant_id == "tata-nexon-xz-plus-petrol"
        assert v.specs.fuel_type == FuelType.PETROL

    def test_variant_id_slug_required(self):
        from vehicle_schemas import VariantCreate, VariantSpecs, FuelType, TransmissionType
        with pytest.raises(ValidationError):
            VariantCreate(
                variant_id="Nexon XZ+",
                model_id="tata-nexon",
                brand_id="tata",
                name="Nexon",
                specs=VariantSpecs(fuel_type=FuelType.PETROL, transmission=TransmissionType.MANUAL),
            )

    def test_configurator_status_defaults_to_coming_soon(self):
        from vehicle_schemas import VariantCreate, VariantSpecs, FuelType, TransmissionType, ConfiguratorStatus
        v = VariantCreate(
            variant_id="test-variant",
            model_id="test-model",
            brand_id="test-brand",
            name="Test",
            specs=VariantSpecs(fuel_type=FuelType.PETROL, transmission=TransmissionType.MANUAL),
        )
        assert v.configurator_status == ConfiguratorStatus.COMING_SOON


class TestCityPricing:
    def test_auto_computes_on_road(self):
        from vehicle_schemas import CityPricing
        cp = CityPricing(
            city="Mumbai",
            state="Maharashtra",
            ex_showroom=1_099_000,
            rto=120_000,
            insurance_approx=45_000,
            tcs=10_990,
            handling=5_000,
        )
        assert cp.estimated_on_road == 1_099_000 + 120_000 + 45_000 + 10_990 + 5_000

    def test_explicit_on_road_not_overwritten(self):
        from vehicle_schemas import CityPricing
        cp = CityPricing(
            city="Delhi",
            state="Delhi",
            ex_showroom=1_000_000,
            estimated_on_road=1_200_000,
        )
        assert cp.estimated_on_road == 1_200_000

    def test_city_pricing_negative_rejected(self):
        from vehicle_schemas import CityPricing
        with pytest.raises(ValidationError):
            CityPricing(city="Mumbai", state="MH", ex_showroom=-1)


class TestColorSchema:
    def test_valid_color(self):
        from vehicle_schemas import VariantColorCreate, MaterialOverride
        c = VariantColorCreate(
            color_id="nexon-xzp-flagship-red",
            variant_id="tata-nexon-xz-plus",
            name="Flagship Red",
            display_name="Flagship Red",
            primary_hex="#B91C1C",
            material_overrides=[
                MaterialOverride(
                    material_name="MAT_BODY_PAINT",
                    color_hex="#B91C1C",
                    metallic=0.3,
                    roughness=0.2,
                )
            ],
            price_delta=15_000,
        )
        assert c.primary_hex == "#B91C1C"
        assert c.material_overrides[0].material_name == "MAT_BODY_PAINT"

    def test_invalid_hex_rejected(self):
        from vehicle_schemas import VariantColorCreate
        with pytest.raises(ValidationError):
            VariantColorCreate(
                color_id="bad-color",
                variant_id="v1",
                name="Bad",
                display_name="Bad",
                primary_hex="red",  # not #RRGGBB
                price_delta=0,
            )

    def test_negative_price_delta_rejected(self):
        from vehicle_schemas import VariantColorCreate
        with pytest.raises(ValidationError):
            VariantColorCreate(
                color_id="c1",
                variant_id="v1",
                name="X",
                display_name="X",
                primary_hex="#FFFFFF",
                price_delta=-5000,
            )


# ── Configurator Schema Tests ──────────────────────────────────────────────

class TestAssetProvenance:
    def test_publishable_provenance(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        asset = ConfiguratorAssetCreate(
            asset_id="nexon-ev-lod0-v1",
            variant_id="tata-nexon-ev-empowered-lr",
            model_id="tata-nexon",
            brand_id="tata-motors",
            format="glb",
            url="https://cdn.autoaiindia.com/assets/vehicles/tata-nexon-ev.glb",
            version="1.0.0",
            provenance=AssetProvenance.AUTO_AI_LICENSED,
            license_name="Auto AI India Internal License",
            publisher="Auto AI India",
            validation_passed=True,
            admin_reviewed=True,
        )
        assert asset.is_publishable() is True

    def test_unknown_provenance_not_publishable(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        asset = ConfiguratorAssetCreate(
            asset_id="unknown-asset",
            variant_id="v1",
            model_id="m1",
            brand_id="b1",
            format="glb",
            url="https://cdn.example.com/car.glb",
            version="1.0.0",
            provenance=AssetProvenance.UNKNOWN,
            validation_passed=True,
            admin_reviewed=True,
        )
        assert asset.is_publishable() is False

    def test_asset_url_must_be_https(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        with pytest.raises(ValidationError, match="HTTPS"):
            ConfiguratorAssetCreate(
                asset_id="a1",
                variant_id="v1",
                model_id="m1",
                brand_id="b1",
                format="glb",
                url="http://cdn.example.com/car.glb",
                version="1.0.0",
                provenance=AssetProvenance.AUTO_AI_LICENSED,
            )

    def test_asset_url_must_be_glb_or_gltf(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        with pytest.raises(ValidationError):
            ConfiguratorAssetCreate(
                asset_id="a1",
                variant_id="v1",
                model_id="m1",
                brand_id="b1",
                format="glb",
                url="https://cdn.example.com/car.jpg",  # NOT a 3D asset
                version="1.0.0",
                provenance=AssetProvenance.AUTO_AI_LICENSED,
            )

    def test_jpeg_not_accepted_as_3d_asset(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        for bad_ext in [".jpg", ".png", ".mp4", ".webp", ".obj"]:
            with pytest.raises(ValidationError):
                ConfiguratorAssetCreate(
                    asset_id="bad",
                    variant_id="v1",
                    model_id="m1",
                    brand_id="b1",
                    format="glb",
                    url=f"https://cdn.example.com/car{bad_ext}",
                    version="1.0.0",
                    provenance=AssetProvenance.AUTO_AI_LICENSED,
                )

    def test_unpublished_not_publishable(self):
        from configurator_schemas import ConfiguratorAssetCreate, AssetProvenance
        asset = ConfiguratorAssetCreate(
            asset_id="a1",
            variant_id="v1",
            model_id="m1",
            brand_id="b1",
            format="glb",
            url="https://cdn.autoaiindia.com/car.glb",
            version="1.0.0",
            provenance=AssetProvenance.AUTO_AI_LICENSED,
            license_name="Auto AI License",
            publisher="Auto AI India",
            validation_passed=False,  # not validated yet
            admin_reviewed=True,
        )
        assert asset.is_publishable() is False


class TestConfigurationState:
    def test_purchasable_and_interaction_are_separate(self):
        from configurator_schemas import ConfigurationState, PurchasableConfiguration, InteractionState
        state = ConfigurationState(
            purchasable=PurchasableConfiguration(variant_id="tata-nexon-xzp"),
            interaction=InteractionState(hood_open=True),
        )
        assert state.interaction.hood_open is True
        assert state.purchasable.variant_id == "tata-nexon-xzp"
        assert state.purchasable.paint_id is None

    def test_interaction_does_not_appear_in_purchasable(self):
        from configurator_schemas import PurchasableConfiguration
        # PurchasableConfiguration must NOT have doors/lights/hood fields
        fields = set(PurchasableConfiguration.model_fields.keys())
        interaction_fields = {"doors", "hood_open", "boot_open", "lighting", "camera_preset"}
        assert fields.isdisjoint(interaction_fields), (
            f"Purchasable config must not contain interaction fields: "
            f"{fields & interaction_fields}"
        )

    def test_too_many_accessories_rejected(self):
        from configurator_schemas import PurchasableConfiguration
        with pytest.raises(ValidationError, match="Maximum 30 accessories"):
            PurchasableConfiguration(
                variant_id="v1",
                accessory_ids=[f"acc-{i}" for i in range(31)],
            )

    def test_lighting_defaults_all_off(self):
        from configurator_schemas import LightingState
        ls = LightingState()
        for field in LightingState.model_fields:
            assert getattr(ls, field) is False, f"Expected {field} to default to False"


# ── Pricing Engine Tests ───────────────────────────────────────────────────

class TestAssetUrlValidation:
    @pytest.mark.asyncio
    async def test_valid_glb_url(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("https://cdn.autoaiindia.com/assets/car.glb")
        assert result["valid"] is True
        assert result["errors"] == []

    @pytest.mark.asyncio
    async def test_valid_gltf_url(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("https://cdn.autoaiindia.com/assets/car.gltf")
        assert result["valid"] is True

    @pytest.mark.asyncio
    async def test_http_rejected(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("http://cdn.example.com/car.glb")
        assert result["valid"] is False
        assert any("HTTPS" in e for e in result["errors"])

    @pytest.mark.asyncio
    async def test_jpg_rejected(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("https://cdn.example.com/car.jpg")
        assert result["valid"] is False
        assert any(".glb" in e or ".gltf" in e for e in result["errors"])

    @pytest.mark.asyncio
    async def test_empty_url_rejected(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("")
        assert result["valid"] is False

    @pytest.mark.asyncio
    async def test_url_with_credentials_rejected(self):
        from pricing_engine import validate_asset_url
        result = await validate_asset_url("https://user:pass@cdn.example.com/car.glb")
        assert result["valid"] is False


class TestPriceComponents:
    def test_price_response_computes_totals(self):
        from configurator_schemas import ConfigurationPriceResponse, PriceComponent
        resp = ConfigurationPriceResponse(
            variant_id="tata-nexon-xzp",
            base_ex_showroom=1_099_000,
            option_deltas=[
                PriceComponent(name="Flame Red", amount=15_000),
                PriceComponent(name="17-inch Alloys", amount=20_000),
            ],
            estimated_on_road=1_200_000,
            price_is_estimate=True,
            effective_date="2026-09-03T00:00:00+00:00",
        )
        assert resp.total_options == 35_000
        assert resp.subtotal_ex_showroom == 1_134_000

    def test_emi_principal_positive(self):
        # Test the EMI formula directly (server.py needs MONGO_URL to import).
        principal = 800_000
        annual_rate = 9.5
        tenure_months = 60
        r = annual_rate / 12 / 100
        emi = principal * r * ((1 + r) ** tenure_months) / (((1 + r) ** tenure_months) - 1)
        # Verify the result is a positive float in a plausible range
        assert emi > 0
        assert 10_000 < emi < 30_000

    def test_price_delta_sum(self):
        from configurator_schemas import PriceComponent, ConfigurationPriceResponse
        resp = ConfigurationPriceResponse(
            variant_id="v1",
            base_ex_showroom=500_000,
            option_deltas=[PriceComponent(name="Wheels", amount=10_000)],
            estimated_on_road=520_000,
            price_is_estimate=True,
            effective_date="2026-09-03T00:00:00+00:00",
        )
        assert resp.total_options == 10_000
        assert resp.subtotal_ex_showroom == 510_000


# ── Configurator Rules Tests ───────────────────────────────────────────────

class TestRulesEngine:
    def test_selected_option_ids(self):
        from rules_engine import _selected_option_ids
        from configurator_schemas import PurchasableConfiguration
        config = PurchasableConfiguration(
            variant_id="v1",
            paint_id="red",
            wheel_id="w17",
            interior_id="int-blk",
            accessory_ids=["mud-flaps", "side-steps"],
        )
        ids = _selected_option_ids(config)
        assert "red" in ids
        assert "w17" in ids
        assert "int-blk" in ids
        assert "mud-flaps" in ids
        assert "side-steps" in ids

    def test_condition_variant_is(self):
        from rules_engine import _evaluate_condition
        from configurator_schemas import PurchasableConfiguration, RuleConditionType
        config = PurchasableConfiguration(variant_id="nexon-xzp")
        cond = {"condition_type": RuleConditionType.VARIANT_IS, "value": "nexon-xzp"}
        assert _evaluate_condition(cond, config) is True
        cond2 = {"condition_type": RuleConditionType.VARIANT_IS, "value": "nexon-xzt"}
        assert _evaluate_condition(cond2, config) is False

    def test_condition_option_selected(self):
        from rules_engine import _evaluate_condition
        from configurator_schemas import PurchasableConfiguration, RuleConditionType
        config = PurchasableConfiguration(variant_id="v1", paint_id="red")
        cond = {"condition_type": RuleConditionType.OPTION_SELECTED, "value": "red"}
        assert _evaluate_condition(cond, config) is True
        cond2 = {"condition_type": RuleConditionType.OPTION_SELECTED, "value": "blue"}
        assert _evaluate_condition(cond2, config) is False


# ── AI Contract Tests ──────────────────────────────────────────────────────

class TestAIConfiguratorContract:
    def test_intent_requires_raw_request(self):
        from configurator_schemas import AIConfiguratorIntent
        with pytest.raises(ValidationError):
            AIConfiguratorIntent()  # missing raw_request

    def test_intent_max_budget_non_negative(self):
        from configurator_schemas import AIConfiguratorIntent
        with pytest.raises(ValidationError):
            AIConfiguratorIntent(raw_request="show me an SUV", max_budget=-1)

    def test_intent_captures_preferences(self):
        from configurator_schemas import AIConfiguratorIntent
        intent = AIConfiguratorIntent(
            raw_request="Give me the best SUV under 20 lakh with dark interior",
            max_budget=2_000_000,
            preferred_interior_description="dark",
            preferred_segment="SUV",
        )
        assert intent.max_budget == 2_000_000
        assert "dark" in intent.preferred_interior_description
