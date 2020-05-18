import { useState, useEffect, useRef, useMemo } from 'react'
import * as _ from 'lodash'
import { useParams, useLocation, useHistory, useRouteMatch } from 'react-router-dom';
import queryString from 'query-string';
import * as ReactDOM from 'react-dom';

export function usePreviousN(...values: any[]) {
    const ref = useRef<any[]>(values)
    useEffect(() => {
        ref.current = values;
    }, values)
    return ref.current
}

export function usePrevious(value: any, initialValue: any) {
    const ref = useRef(initialValue)
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export function useEffectDebugger(effectHook: any, dependencies: any[], dependencyNames: string[] = [], name: string = '') {
    const previousDeps = usePrevious(dependencies, [])
    const changedDeps = dependencies.reduce((accum, dependency, index) => {
        if (dependency !== previousDeps[index]) {
            const keyName = dependencyNames[index] || index
            return {
                ...accum,
                [keyName]: {
                    before: previousDeps[index],
                    after: dependency,
                },
            }
        }
        return accum
    }, {})
    if (Object.keys(changedDeps).length) {
        console.log('[use-effect-debugger] ' + name, changedDeps)
    }
    useEffect(effectHook, dependencies)
}

// @ts-ignore
export function useWhyDidYouUpdate(name, props) {
    const previousProps = useRef();
    useEffect(() => {
        if (previousProps.current) {
            // @ts-ignore
            const allKeys = Object.keys({ ...previousProps.current, ...props });
            const changesObj = {};
            allKeys.forEach(key => {
                // @ts-ignore
                if (previousProps.current[key] !== props[key]) {
                    // @ts-ignore
                    changesObj[key] = {
                        // @ts-ignore
                        from: previousProps.current[key],
                        to: props[key]
                    };
                }
            });
            if (Object.keys(changesObj).length) {
                console.log('[why-did-you-update]', name, changesObj);
            }
        }
        previousProps.current = props;
    });
}

export function useWindowSize() {
    function getSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    const [windowSize, setWindowSize] = useState(getSize);
    useEffect(() => {
        function handleResize() {
            setWindowSize(getSize());
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures that effect is only run on mount and unmount
    return windowSize;
}

export function useRouter() {
    const params = useParams();
    const location = useLocation();
    const history = useHistory();
    const match = useRouteMatch();

    // Return our custom router object
    // Memoize so that a new object is only returned if something changes
    return useMemo(() => {
        return {
            // For convenience add push(), replace(), pathname at top level
            push: history.push,
            replace: history.replace,
            pathname: location.pathname,
            // Merge params and parsed query string into single "query" object
            // so that they can be used interchangeably.
            // Example: /:topic?sort=popular -> { topic: "react", sort: "popular" }
            query: {
                ...queryString.parse(location.search), // Convert string to object
                ...params
            },
            // Include match, location, history objects so we have
            // access to extra React Router functionality if needed.
            match,
            location,
            history
        };
    }, [params, match, location, history]);
}

//////////////////////////////////////// Levenshtein distance

export function levenshteinAlignment(
    iWords: string[],
    i: number,
    jWords: string[],
    j: number,
    cache: (number | boolean)[][]
): any {
    if (cache[i][j] !== false) {
        return cache[i][j]
    }
    let out
    if (i >= iWords.length) {
        out = { distance: Math.abs(jWords.length - j) }
    } else if (j >= jWords.length) {
        out = { distance: Math.abs(iWords.length - i) }
    } else {
        let ret1 = _.clone(levenshteinAlignment(iWords, i + 1, jWords, j, cache))
        ret1.distance += 1
        let ret2 = _.clone(levenshteinAlignment(iWords, i, jWords, j + 1, cache))
        ret2.distance += 1
        let ret3 = _.clone(levenshteinAlignment(iWords, i + 1, jWords, j + 1, cache))
        if (iWords[i] === jWords[j]) ret3[i] = j
        else ret3.distance += 1
        if (ret1.distance < ret2.distance && ret1.distance < ret3.distance) {
            out = ret1
        } else if (ret2.distance < ret1.distance && ret2.distance < ret3.distance) {
            out = ret2
        } else {
            out = ret3
        }
    }
    cache[i][j] = out
    return out
}

export function alignWords(newWords: string[], oldWords: string[]): any {
    let cache: (number | boolean)[][] = []
    _.forEach(_.range(0, newWords.length + 2), i => {
        cache[i] = []
        _.forEach(_.range(0, oldWords.length + 2), j => {
            cache[i][j] = false
        })
    })
    return levenshteinAlignment(newWords, 0, oldWords, 0, cache)
}

export function parseSegment(segmentName: string) {
    const s = segmentName.split(':')
    return { movieName: s[0], startTime: parseFloat(s[1]), endTime: parseFloat(s[2]) }
}

// export function segmentString(details: { movieName: string; startTime: number; endTime: number }) {
//     return mkSegmentName(details.movieName, details.startTime, details.endTime)
// }

export function batched(fn: any) {
    return (() => {
        Promise.resolve().then(() => ReactDOM.unstable_batchedUpdates(() => fn()));
        return false
    })
}
