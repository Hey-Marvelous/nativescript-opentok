import {Observable} from 'data/observable';
import {topmost} from 'ui/frame';
import {screen} from 'platform';
import {ContentView} from 'ui/content-view'
import {TNSOTSession} from './session';

declare var OTPublisher: any,
            CGRectMake: any,
            OTPublisherKitDelegate: any,
            AVCaptureDevicePositionBack: any,
            AVCaptureDevicePositionFront: any;

export class TNSOTPublisher extends ContentView {

    private _ios: any;
    private _publisherKitDelegate: any;
    private _session: TNSOTSession;

    private _sessionId: any;
    private _apiKey: string;
    private _token: string;

    constructor() {
        super();
        this._publisherKitDelegate = TNSPublisherKitDelegateImpl.initWithOwner(new WeakRef(this));
        this._ios = new OTPublisher(this._publisherKitDelegate);
    }

    _createUI() {
        this.onLoaded = () => {
            this.connect();
        };
    }

    private connect(): void {
        if(this._apiKey && this._sessionId && this._token) {
            this._session = new TNSOTSession(this._apiKey);
            this._session.initSession(this._sessionId).then((result) => {
                this._session.connect(this._token).then(() => {}, (error) => {
                    console.log('Failed to connect to session: ' + error);
                });
            }, (error) => {
                console.log('Failed to initialize session: ' + error);
            });
            this._session.events.on('sessionDidConnect', (result) => {
                this.publishStream(result.object);
            });
        }
    }

    private publishStream(session: any): void {
        this._ios.publishAudio = true;
        try {
            session.publish(this._ios);
        } catch (error) {
            console.log(error);
        }
    }

    get ios(): any {
        return this._ios;
    }

    get _nativeView(): any {
        return this._ios.view;
    }

    set sessionId(sessionId: string) {
        this._sessionId = sessionId;
        this.connect();
    }

    set api(apiKey: string) {
        this._apiKey = apiKey;
        this.connect();
    }

    set token(token: string) {
        this._token = token;
        this.connect();
    }

    cycleCamera(): void {
        if(this._ios) {
            if(this._ios.cameraPosition === AVCaptureDevicePositionBack) {
                this._ios.cameraPosition = AVCaptureDevicePositionFront;
            }
            else {
                this._ios.cameraPosition = AVCaptureDevicePositionBack;
            }
        }
    }

    toggleCamera(): void {
        if(this._ios) {
            this._ios.publishVideo = !this._ios.publishVideo;
        }
    }

    toggleMute():void  {
        if(this._ios) {
            this._ios.publishAudio = !this._ios.publishAudio;
        }
    }

    get session(): TNSOTSession {
        if(this._session) {
            this._session.publisher = this._ios;
        }
        return this._session;
    }

    get events(): Observable {
        return this._publisherKitDelegate.events;
    }

}

class TNSPublisherKitDelegateImpl extends NSObject {

    public static ObjCProtocols = [OTPublisherKitDelegate];

    private _events: Observable;
    private _owner: WeakRef<any>;

    public static initWithOwner(owner: WeakRef<any>): TNSPublisherKitDelegateImpl {
        let publisherKitDelegate = new TNSPublisherKitDelegateImpl();
        publisherKitDelegate._events = new Observable();
        publisherKitDelegate._owner = owner;
        return publisherKitDelegate;
    }

    public publisherStreamCreated(publisher: any, stream: any) {
        if(this._events) {
            this._events.notify({
                eventName: 'streamCreated',
                object: new Observable({
                    publisher: publisher,
                    stream: stream
                })
            });
        }
    }

    public publisherStreamDestroyed(publisher: any, stream: any) {
        if(this._events) {
            this._events.notify({
                eventName: 'streamDestroyed',
                object: new Observable({
                    publisher: publisher,
                    stream: stream
                })
            });
        }
        topmost().currentPage.ios.view.removeFromSuperview(publisher.view);
    }

    public publisherDidFailWithError(publisher: any, error: any) {
        if(this._events) {
            this._events.notify({
                eventName: 'didFailWithError',
                object: new Observable({
                    publisher: publisher,
                    error: error
                })
            });
        }
    }

    get events(): Observable {
        return this._events;
    }

}