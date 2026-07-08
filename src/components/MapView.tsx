import React, { useEffect, useRef, useState } from 'react';
import { Restaurant } from '@/lib/mock-data';
import { Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    naver: any;
  }
}

interface MapViewProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  onSelectRestaurant: (id: string) => void;
  onMapClick: () => void;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const NAVER_MAP_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;

let naverMapsScriptPromise: Promise<void> | null = null;

function loadNaverMapsScript(clientId: string): Promise<void> {
  if (typeof window !== 'undefined' && window.naver?.maps) {
    return Promise.resolve();
  }

  if (naverMapsScriptPromise) {
    return naverMapsScriptPromise;
  }

  naverMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&submodules=geocoder`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('네이버 지도 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  return naverMapsScriptPromise;
}

function hasValidCoordinates(restaurant: Restaurant) {
  return (
    typeof restaurant.lat === 'number' &&
    Number.isFinite(restaurant.lat) &&
    typeof restaurant.lng === 'number' &&
    Number.isFinite(restaurant.lng) &&
    restaurant.lat !== 0 &&
    restaurant.lng !== 0
  );
}

function buildMarkerIconHtml(isSelected: boolean) {
  const bg = isSelected ? '#f97316' : '#ffffff';
  const fg = isSelected ? '#ffffff' : '#f97316';

  return `
    <div style="width:34px;height:34px;border-radius:9999px;display:flex;align-items:center;justify-content:center;
      background:${bg};border:2px solid #f97316;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z"/>
        <circle cx="12" cy="11" r="2.2" fill="${fg}" stroke="none"/>
      </svg>
    </div>
  `;
}

function buildClusterIconHtml(count: number) {
  return `
    <div style="width:38px;height:38px;border-radius:9999px;display:flex;align-items:center;justify-content:center;
      background:#f97316;border:2px solid #ffffff;color:#ffffff;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
      ${count}
    </div>
  `;
}

export default function MapView({
  restaurants,
  selectedRestaurantId,
  onSelectRestaurant,
  onMapClick,
}: MapViewProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const clusterMarkersRef = useRef<Record<string, any>>({});
  const currentLocationMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!NAVER_MAP_CLIENT_ID) {
      setLoadError('VITE_NAVER_MAP_CLIENT_ID 환경변수가 설정되지 않았습니다.');
      return;
    }

    let cancelled = false;

    loadNaverMapsScript(NAVER_MAP_CLIENT_ID)
      .then(() => {
        if (cancelled || !mapElRef.current) return;

        const { naver } = window;

        const map = new naver.maps.Map(mapElRef.current, {
          center: new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          zoom: 13,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.RIGHT_CENTER,
          },
        });

        naver.maps.Event.addListener(map, 'click', () => {
          onMapClick();
        });

        mapInstanceRef.current = map;
        setMapReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const { naver } = window;

    Object.values(markersRef.current).forEach((marker: any) => marker.setMap(null));
    Object.values(clusterMarkersRef.current).forEach((marker: any) => marker.setMap(null));
    markersRef.current = {};
    clusterMarkersRef.current = {};

    const visibleRestaurants = restaurants.filter(hasValidCoordinates);
    const selectedRestaurant = visibleRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ?? null;
    const restaurantsToRender = selectedRestaurant ? visibleRestaurants.filter((restaurant) => restaurant.id !== selectedRestaurant.id) : visibleRestaurants;

    const createMarker = (restaurant: Restaurant, isSelected: boolean) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(restaurant.lat, restaurant.lng),
        map: mapInstanceRef.current,
        icon: {
          content: buildMarkerIconHtml(isSelected),
          anchor: new naver.maps.Point(17, 34),
        },
        zIndex: isSelected ? 100 : 1,
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        onSelectRestaurant(restaurant.id);
      });

      markersRef.current[restaurant.id] = marker;
    };

    if (selectedRestaurant) {
      createMarker(selectedRestaurant, true);
    }

    const shouldCluster = restaurantsToRender.length >= 8;

    if (!shouldCluster) {
      restaurantsToRender.forEach((restaurant) => createMarker(restaurant, false));
    } else {
      const projection = mapInstanceRef.current.getProjection();
      const zoom = mapInstanceRef.current.getZoom();
      const pixelThreshold = Math.max(40, 65 - zoom * 3);
      const remainingRestaurants = [...restaurantsToRender];
      const clusters: Array<{ restaurants: Restaurant[]; center: any }> = [];

      while (remainingRestaurants.length > 0) {
        const seedRestaurant = remainingRestaurants.shift()!;
        const seedOffset = projection.fromCoordToOffset(new naver.maps.LatLng(seedRestaurant.lat, seedRestaurant.lng));
        const clusterRestaurants = [seedRestaurant];
        let totalX = seedOffset.x;
        let totalY = seedOffset.y;

        for (let index = remainingRestaurants.length - 1; index >= 0; index -= 1) {
          const candidate = remainingRestaurants[index];
          const candidateOffset = projection.fromCoordToOffset(new naver.maps.LatLng(candidate.lat, candidate.lng));
          const distance = Math.hypot(candidateOffset.x - totalX / clusterRestaurants.length, candidateOffset.y - totalY / clusterRestaurants.length);

          if (distance < pixelThreshold) {
            clusterRestaurants.push(candidate);
            totalX += candidateOffset.x;
            totalY += candidateOffset.y;
            remainingRestaurants.splice(index, 1);
          }
        }

        const averageX = totalX / clusterRestaurants.length;
        const averageY = totalY / clusterRestaurants.length;
        const center = projection.fromOffsetToCoord(new naver.maps.Point(averageX, averageY));
        clusters.push({ restaurants: clusterRestaurants, center });
      }

      clusters.forEach((cluster) => {
        if (cluster.restaurants.length > 1) {
          const marker = new naver.maps.Marker({
            position: cluster.center,
            map: mapInstanceRef.current,
            icon: {
              content: buildClusterIconHtml(cluster.restaurants.length),
              anchor: new naver.maps.Point(19, 19),
            },
            zIndex: 2,
          });

          naver.maps.Event.addListener(marker, 'click', () => {
            const bounds = new naver.maps.LatLngBounds();
            cluster.restaurants.forEach((restaurant) => {
              bounds.extend(new naver.maps.LatLng(restaurant.lat, restaurant.lng));
            });
            mapInstanceRef.current.fitBounds(bounds, { top: 80, right: 20, bottom: 80, left: 20 });
          });

          clusterMarkersRef.current[cluster.restaurants.map((restaurant) => restaurant.id).join('-')] = marker;
        } else {
          createMarker(cluster.restaurants[0], false);
        }
      });
    }

    const allDisplayRestaurants = selectedRestaurant ? [selectedRestaurant, ...restaurantsToRender] : visibleRestaurants;

    if (allDisplayRestaurants.length === 1) {
      const restaurant = allDisplayRestaurants[0];
      mapInstanceRef.current.setCenter(new naver.maps.LatLng(restaurant.lat, restaurant.lng));
      mapInstanceRef.current.setZoom(15);
    }

    if (allDisplayRestaurants.length > 1) {
      const bounds = new naver.maps.LatLngBounds();

      allDisplayRestaurants.forEach((restaurant) => {
        bounds.extend(new naver.maps.LatLng(restaurant.lat, restaurant.lng));
      });

      mapInstanceRef.current.fitBounds(bounds, { top: 80, right: 20, bottom: 80, left: 20 });
    }

    return () => {
      Object.values(markersRef.current).forEach((marker: any) => marker.setMap(null));
      Object.values(clusterMarkersRef.current).forEach((marker: any) => marker.setMap(null));
    };
  }, [restaurants, selectedRestaurantId, mapReady, onSelectRestaurant]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !selectedRestaurantId) return;

    const restaurant = restaurants.find((r) => r.id === selectedRestaurantId);
    if (!restaurant || restaurant.lat == null || restaurant.lng == null) return;

    const { naver } = window;
    mapInstanceRef.current.panTo(new naver.maps.LatLng(restaurant.lat, restaurant.lng));
  }, [selectedRestaurantId, mapReady, restaurants]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('브라우저에서 위치 정보를 지원하지 않습니다.');
      return;
    }

    setLocationStatus('현재 위치를 찾는 중...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const { naver } = window;
        if (!mapInstanceRef.current || !naver?.maps) return;

        const currentLocation = new naver.maps.LatLng(latitude, longitude);
        mapInstanceRef.current.panTo(currentLocation);
        mapInstanceRef.current.setZoom(15);

        if (currentLocationMarkerRef.current) {
          currentLocationMarkerRef.current.setMap(null);
        }

        currentLocationMarkerRef.current = new naver.maps.Marker({
          position: currentLocation,
          map: mapInstanceRef.current,
          icon: {
            content: '<div style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.2);"></div>',
            anchor: new naver.maps.Point(7, 7),
          },
        });

        setLocationStatus('현재 위치로 이동했습니다.');
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED ? '위치 권한이 거부되었습니다.' : '현재 위치를 가져오지 못했습니다.';
        setLocationStatus(message);
        if (error.code === error.PERMISSION_DENIED) {
          toast({ title: '위치 권한 필요', description: '브라우저 설정에서 위치 권한을 허용해 주세요.' });
        }
      },
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full" data-testid="map-container">
      <div ref={mapElRef} className="absolute inset-0 w-full h-full" />

      <button
        type="button"
        onClick={handleCurrentLocation}
        className="absolute bottom-28 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-orange-100 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5"
        aria-label="현재 위치로 이동"
      >
        <Navigation size={18} className="text-primary" />
      </button>

      {locationStatus && (
        <div className="absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-full border border-orange-100 bg-white/95 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          {locationStatus}
        </div>
      )}

      {!mapReady && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,237,213,0.7),_rgba(255,247,237,0.95))] text-sm font-medium text-gray-600">
          <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm">지도를 불러오는 중...</div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_top,_rgba(255,237,213,0.8),_rgba(255,247,237,0.95))] p-6 text-center text-sm text-gray-600">
          <p className="font-bold text-primary">지도를 표시할 수 없습니다</p>
          <p>{loadError}</p>
        </div>
      )}
    </div>
  );
}