import {
  Matcher,
  SelectableStaticFilter,
  useSearchActions,
  useSearchState,
} from "@yext/search-headless-react";
import {
  AppliedFilters,
  Geolocation,
  MapboxMap,
  Pagination,
  ResultsCount,
  SearchBar,
  VerticalResults,
  onSearchFunc,
} from "@yext/search-ui-react";
import { LngLat, LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as React from "react";
import { useEffect, useState } from "react";
import Loader from "./Loader";
import LocationCard from "./LocationCard";
import MapPin from "./MapPin";
import { useLocationsContext } from "../common/LocationsContext";
import {
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

type PromoBanner = {
  url: string;
  alternateText?: string;
};

type LocatorProps = {
  verticalKey: string;
  name?: string;
  c_promoBanner?: PromoBanner;
};

const colorMap: Record<string, string> = {
  "Negozio Flagship Sky": "#FF5733",
  "Negozio Sky": "#33C3FF",
  "Rivenditori Sky Autorizzati": "#FFC133",
  Vendita: "#2ECC71",
  "Post Vendita": "#27AE60",
};

const getColorByOption = (optionLabel: string) => {
  return colorMap[optionLabel] || "#000000";
};

const Locator = ({ verticalKey, name, c_promoBanner }: LocatorProps) => {
  const searchActions = useSearchActions();
  const filters = useSearchState((state) => state.filters.static);
  const facets = useSearchState((state) => state.filters.facets);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [highlightedFacetOption, setHighlightedFacetOption] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const {
    selectedLocationId: _selectedLocationId,
    setSelectedLocationId: _setSelectedLocationId,
  } = useLocationsContext();

  useEffect(() => {
    if (selectedLocationId) {
      _setSelectedLocationId(selectedLocationId);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    searchActions.setVertical(verticalKey);
    const queryParams = new URLSearchParams(window.location.search);
    const q = queryParams.get("query");
    if (q) searchActions.setQuery(q);
    searchActions.executeVerticalQuery().then(() => setIsLoading(false));
  }, []);

  const handleSearch: onSearchFunc = (searchEventData) => {
    const { query } = searchEventData;
    searchActions.executeVerticalQuery();
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.delete("type");
    if (query) queryParams.set("query", query);
    else queryParams.delete("query");
    history.pushState(null, "", "?" + queryParams.toString());
  };

  const onDrag = React.useCallback(
    (center: LngLat, bounds: LngLatBounds) => {
      const radiusInMiles = center.distanceTo(bounds.getNorthEast());
      const radius = radiusInMiles * 1.60934;
      const nonLocationFilters =
        filters?.filter(
          (f) =>
            f.filter.kind !== "fieldValue" ||
            f.filter.fieldId !== "builtin.location"
        ) ?? [];
      const nearFilter: SelectableStaticFilter = {
        selected: true,
        displayName: "Near Current Area",
        filter: {
          kind: "fieldValue",
          fieldId: "builtin.location",
          matcher: Matcher.Near,
          value: { ...center, radius },
        },
      };
      searchActions.setStaticFilters([...nonLocationFilters, nearFilter]);
      searchActions.executeVerticalQuery();
    },
    [filters, searchActions]
  );

  const handleStaticFilterClick = (fieldId: string, value: string) => {
    const filter: SelectableStaticFilter = {
      selected: true,
      displayName: value,
      filter: {
        kind: "fieldValue",
        fieldId,
        matcher: Matcher.Equals,
        value,
      },
    };
    searchActions.setStaticFilters([filter]);
    setHighlightedFacetOption(value);
    searchActions.executeVerticalQuery();
  };

  return (
    <>
      {name && <h1 className="text-4xl font-bold text-center mt-6">{name}</h1>}

      <div className="centered-container">
        <div className="flex gap-8 w-full items-center my-6">
          <SearchBar
            customCssClasses={{ searchBarContainer: "w-full ml-8" }}
            placeholder="Enter an address, zip code, or city and state"
            onSearch={handleSearch}
          />
        </div>
      </div>

      <div className="flex flex-row">
        <div className="flex flex-col w-[40%] p-4 overflow-scroll relative" style={{ height: "80vh" }}>
          {c_promoBanner?.url && (
            <div className="w-full mt-6">
              <img
                src={c_promoBanner.url}
                alt={c_promoBanner.alternateText || name || "Promo Banner"}
                className="w-full max-h-[400px] object-cover rounded-xl"
              />
            </div>
          )}

          <div className="mt-6 mb-4">
            <button
              className="text-md font-semibold flex items-center gap-2 text-blue-600 hover:underline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <FaChevronUp /> : <FaChevronDown />} Filters
            </button>
          </div>

          {/* START FILTERS */}
          {showFilters && (
            <div className="mb-6">
              <div className="flex flex-col gap-4">

                {/* Store Type facet rendered as tabs */}
                {facets
                  ?.filter((facet) => facet.displayName.includes("Store"))
                  .map((facet, index) => (
                    <div key={index}>
                      <h3 className="text-lg font-bold mb-2">{facet.displayName}</h3>
                      <div className="flex gap-2 flex-wrap">
                        {facet.options.map((option, i) => {
                          const label = option.displayName || option.value;
                          const color = getColorByOption(label);
                          const isSelected = option.selected;
                          const count = option.count || 0;
                          return (
                            <div
                              key={i}
                              className={`relative px-4 py-1 border rounded-full text-sm font-medium cursor-pointer flex items-center gap-1`}
                              style={{
                                borderColor: color,
                                color: isSelected ? "#000000" : color,
                                backgroundColor: isSelected ? color + "33" : "transparent",
                              }}
                              onClick={() => {
                                searchActions.setFacetOption(facet.fieldId, option, !isSelected);
                                setHighlightedFacetOption(label);
                                searchActions.executeVerticalQuery();
                              }}
                            >
                              <span>{isSelected ? "✔️" : "🔘"}</span>
                              {label}
                              {count > 0 && (
                                <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full ml-1">
                                  {count}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                {/* Vendita & Post Vendita as static buttons */}
                <div className="flex gap-2 flex-wrap">
                  {["Vendita", "Post Vendita"].map((label) => (
                    <button
                      key={label}
                      className="flex items-center gap-1 px-4 py-1 border rounded-full text-sm font-medium"
                      style={{
                        borderColor: getColorByOption(label),
                        color: "#000000",
                        backgroundColor: getColorByOption(label) + "33",
                      }}
                      onClick={() => handleStaticFilterClick("custom.storeType", label)}
                    >
                      ✅ {label}
                    </button>
                  ))}
                </div>

                {/* Clear All Filters */}
                <button
                  className="self-start px-4 py-1 border text-sm rounded-full text-red-600 border-red-400 hover:bg-red-50 flex items-center gap-2"
                  onClick={() => {
                    searchActions.setStaticFilters([]);
                    setHighlightedFacetOption(null);
                    searchActions.executeVerticalQuery();
                  }}
                >
                  ❌ Clear All Filters
                </button>
              </div>
            </div>
          )}
          {/* END FILTERS */}

          <div className="mt-6">
            <ResultsCount />
            <AppliedFilters />
            {isLoading ? (
              <div className="h-screen">
                <Loader />
              </div>
            ) : (
              <VerticalResults
                CardComponent={(props) => (
                  <LocationCard
                    {...props}
                    highlightColor={
                      highlightedFacetOption
                        ? getColorByOption(highlightedFacetOption)
                        : undefined
                    }
                  />
                )}
                customCssClasses={{
                  verticalResultsContainer: "flex flex-col gap-4 bg-white",
                }}
              />
            )}
            <div className="mt-4">
              <Pagination />
              <Geolocation
                customCssClasses={{
                  iconContainer: "none",
                  geolocationContainer: "flex flex-col lg:flex-col",
                }}
              />
            </div>
          </div>
        </div>

        <div className="w-[60%] h-[80vh]">
          <MapboxMap
            onDrag={onDrag}
            mapboxOptions={{ zoom: 20 }}
            mapboxAccessToken={import.meta.env.YEXT_PUBLIC_MAP_API_KEY || ""}
            PinComponent={(props) => (
              <MapPin
                {...props}
                pinColor={
                  highlightedFacetOption
                    ? getColorByOption(highlightedFacetOption)
                    : undefined
                }
                selectedLocationId={selectedLocationId}
                setSelectedLocationId={setSelectedLocationId}
                selectedLocationFromContext={_selectedLocationId}
                //pulse={true}
              />
            )}
          />
        </div>
      </div>
    </>
  );
};

export default Locator;
