// ✅ Full Updated Locator.tsx with collapsible filters, icons, counts, and dynamic map pins
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
import { IoIosClose, IoStorefrontSharp } from "react-icons/io5";
import { FaCheckCircle, FaMapMarkerAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";

// ✅ Type for props
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
  const results = useSearchState((state) => state.vertical.results);
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
    let q = queryParams.get("query");
    q && searchActions.setQuery(q);
    searchActions.executeVerticalQuery().then(() => setIsLoading(false));
  }, []);

  const handleSearch: onSearchFunc = (searchEventData) => {
    const { query } = searchEventData;
    searchActions.executeVerticalQuery();
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.delete("type");
    if (query) {
      queryParams.set("query", query);
    } else {
      queryParams.delete("query");
    }
    history.pushState(null, "", "?" + queryParams.toString());
  };

  const onDrag = React.useCallback(
    (center: LngLat, bounds: LngLatBounds) => {
      const radius = center.distanceTo(bounds.getNorthEast());
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

          {/* Collapsible Filter Toggle */}
          <div className="mt-6 mb-4">
            <button
              className="text-md font-semibold flex items-center gap-2 text-blue-600 hover:underline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? <FaChevronUp /> : <FaChevronDown />} Filters
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && facets?.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-col gap-6">
                {facets.map((facet, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-bold mb-2">{facet.displayName}</h3>
                    <div className="flex flex-col gap-2">
                      {facet.options.map((option, i) => {
                        const label = option.displayName || option.value;
                        const color = getColorByOption(label);
                        const isSelected = option.selected;
                        const count = option.count || 0;
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between px-3 py-2 border ${facet.displayName.includes("Store") ? "rounded-md" : ""}`}
                            style={{ borderColor: color, backgroundColor: isSelected ? color + '22' : "transparent", cursor: "pointer" }}
                            onClick={() => {
                              searchActions.setFacetOption(facet.fieldId, option, !isSelected);
                              setHighlightedFacetOption(label);
                              searchActions.executeVerticalQuery();
                            }}
                          >
                            <span className="flex items-center gap-2" style={{ color }}>
                              <FaMapMarkerAlt className="text-sm" />
                              <span className="font-semibold text-sm">{label}</span>
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              />
            )}
          />
        </div>
      </div>
    </>
  );
};

export default Locator;
